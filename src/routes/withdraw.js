/**
 * Created by chengyuan on 2017/5/4.
 */
var express = require('express');
var router = express.Router();
import md5 from 'blueimp-md5';
import {responseJSON, formatPage} from '../common/index';
var {dbQuery, myTransaction} = require('../db/index');
import {usersSql, integralChangeSql} from '../db/sql';
import { key, changeType } from '../config/';
import { getSingleSocket } from '../socket/util';


const withdraw = (io)=> {
    //提现记录
    router.get('/admin/records',async function (req, res, next) {
        let {pageIndex, pageSize, status} = req.query;

        const filterSql = status != 0?` and w.status = ${status}`:'';


        const sql = formatPage("select w.*,u.name user_name,u.account user_account from withdraw_record w" +
            " left join users u on u.user_id = w.user_id where w.status != -1"+filterSql+" order by created_at desc",
            pageIndex, pageSize);

        let rows = await dbQuery(sql);

        let rs = await dbQuery("select count(id) as count from withdraw_record w where status != -1"+filterSql);

        if(rows){
            responseJSON(res, {records: rows, count: rs[0].count});
        }else{
            responseJSON(res);
        }
    });

    router.get('/admin/getApproveNum', async function (req, res) {
        const rs = await dbQuery('select count(id) as count from withdraw_record where status = 1');
        rs?responseJSON(res,{count: rs[0].count}):responseJSON(res);
    });

    //审核提现记录
    router.put('/admin/updateWithdraw',async function (req, res, next) {

        const {id, status} = req.body;

        const userIdRs = await dbQuery('select user_id,withdraw_money,bank_name from withdraw_record where id = ?',[id]);
        const {user_id, withdraw_money, bank_name} = userIdRs[0];

        let rs = false;

        if(status == 3){ //拒绝
            rs = await myTransaction([
                {
                    sql: 'update withdraw_record w,users u set w.status = ?,u.integral = ( u.integral + w.withdraw_money)' +
                    ' where w.user_id = u.user_id and w.id = ?',
                    params: [status, id],
                },
                {
                    sql: integralChangeSql.insert,
                    params: [user_id, withdraw_money, changeType.refuseOut],
                },
                {
                    sql: usersSql.addUserMessage,
                    params: [user_id, '提现申请被拒绝', '管理员拒绝了您的提现申请,详细原因请咨询客服!'],
                },
            ]);
        }else if(status == 2){
            rs = await myTransaction([
                {
                    sql: 'update withdraw_record set status = ? where id = ?',
                    params: [status, id],
                },
                {
                    sql: usersSql.addUserMessage,
                    params: [user_id, '提现成功', `提现成功!已成功提现至您的"${bank_name}"银行卡,提现金额为${withdraw_money},请注意查收`],
                },
            ]);
        }

        if(rs){
            responseJSON(res, {rs});
            let clients = io.of('/app').clients().sockets;
            let socket = getSingleSocket(clients,user_id);
            if(socket){
                socket.emit('newMsg');
            }
        }else{
            responseJSON(res);
        }
    });

    /*****
     *
     *  用户端接口-----
     *
     * ****/
    //用户提现记录
    router.get('/userWithDrawRecord', async function (req, res) {
        const {user_id} = req.loginUser;
        const {pageIndex, pageSize} = req.query;

        const sql = formatPage('select * from withdraw_record where user_id = ? and status != -1 order by' +
            ' created_at desc',
            pageIndex, pageSize);

        let rs = await dbQuery(sql,[user_id]);

        if(rs){
            responseJSON(res, {records: rs});
        }else{
            responseJSON(res)
        }
    });

    router.get('/queryWithdrawPwd', async (req, res, next) => {
        const user = req.loginUser;
        let rows = await dbQuery('select withdraw_password from users where user_id = ?',[user.user_id]);
        if(rows[0].withdraw_password){
            responseJSON(res, {err_code: 0});
        }else{
            responseJSON(res,{err_code: -1});
        }
    });

    router.post('/withdraw', async (req, res, next) => {
        const user = req.loginUser;
        const {withdrawPwd, money, finance_account_id, bank_account, bank_name} = req.body;
        const pwd = md5(withdrawPwd+key.md5);

        let rs = await dbQuery('select integral from users where user_id = ? and withdraw_password = ?',[user.user_id, pwd]);
        if(rs.length == 0){
            responseJSON(res, {err_code: 303,msg: 'password error'});
            return;
        }
        if(rs[0].integral < money){
            responseJSON(res,{err_code: 304,msg: 'integral deficiency'});
            return;
        }

        let rows = await myTransaction([
            {
                sql: 'insert into withdraw_record(user_id,withdraw_money,finance_account_id,bank_account,' +
                'bank_name) values(?,?,?,?,?)',
                params: [user.user_id, money, finance_account_id, bank_account, bank_name],
            },
            {
                sql: "update users integral set integral = (integral - ?) where user_id = ?",
                params: [money, user.user_id],
            },
            {
                sql: integralChangeSql.insert,
                params: [user.user_id, -money, changeType.out],
            },
        ]);

        if(rows){
            responseJSON(res, {});
            io.of('/admin').emit('newWithDraw', {});
        }else{
            responseJSON(res);
        }
    });


    router.put('/setWithdrawPwd', async (req, res, next) => {
        const user = req.loginUser;
        const {withdrawPwd, oldPwd} = req.body;
        const pwd = md5(withdrawPwd+key.md5);
        let rows = false;

        if(oldPwd){
            const old = md5(oldPwd+key.md5);
            let rs = await dbQuery('select user_id from users where withdraw_password = ? and user_id = ?',[old, user.user_id]);
            if(rs && rs.length > 0){//修改密码
                rows = await dbQuery('update users set withdraw_password = ? where user_id = ?',[pwd, user.user_id]);
            }else{
                responseJSON(res, {err_code: 201, msg: 'password error'});
                return;
            }
        }else{//设置密码
            rows = await dbQuery('update users set withdraw_password = ? where user_id = ?',[pwd, user.user_id]);
        }

        if(rows){
            responseJSON(res, {err_code: 0});
        }else{
            responseJSON(res);
        }
    });
    
    return router;
}


module.exports = withdraw;
