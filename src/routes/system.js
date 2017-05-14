/**
 * Created by chengyuan on 2017/5/4.
 */
var express = require('express');
var router = express.Router();
import {responseJSON} from '../common/index';

// 使用DBConfig.js的配置信息创建一个MySQL连接池
var {dbQuery} = require('../db/index');

//房间列表
router.get('/rooms',async function (req, res, next) {
    let rows = await dbQuery("select * from rooms where status");
    rows?responseJSON(res, {rooms: rows}):responseJSON(res);
});

//回水规则列表
router.get('/rollbackRules',async function (req, res, next) {
    let rows = await dbQuery("select * from rollback_rules where status != -1");
    responseJSON(res, {rules: rows});
});

//新增回水规则
router.post('/addRollback',async function (req, res, next) {
    const {name, levels, rates} = req.body;

    let rows = await dbQuery("insert into rollback_rules(name,level_1,level_2,level_3,level_4,rate_1,rate_2,rate_3,rate_4) values(?,?,?,?,?,?,?,?,?)",
    [name, levels[0], levels[1], levels[2], levels[3], rates[0], rates[1], rates[2], rates[3]]);

    if(rows){
        responseJSON(res, {rs: rows});
    }else{
        responseJSON(res);
    }
});

//修改房间状态
router.put('/updateRoomStatus',async function (req, res, next) {
    const {roomId, status} = req.body;

    let rows = await dbQuery("update rooms set status = ? where id = ?",[status, roomId]);

    rows?responseJSON(res, {rs: rows}):responseJSON(res);
});
//修改房间禁言状态
router.put('/updateRoomSpeak',async function (req, res, next) {
    const {roomId, is_speak} = req.body;

    let rows = await dbQuery("update rooms set is_speak = ? where id = ?",[is_speak, roomId]);

    rows?responseJSON(res, {rs: rows}):responseJSON(res);
});

//修改房间回水规则
router.put('/updateRollbackRules',async function (req, res, next) {
    const {roomId, rollbackTypeId} = req.body;

    let rows = await dbQuery("update rooms set rollback_rule_id = ? where id = ?",[rollbackTypeId, roomId]);

    rows?responseJSON(res, {rs: rows}):responseJSON(res);
});

module.exports = router;