import {key} from '../config/index';
import jwt from 'jsonwebtoken';

export let validLogin = (token,callback)=>{
    jwt.verify(token, key.token, function(err, decoded) {
        callback && callback(err, decoded);
    });
}


export let formatPage = (sql, pageIndex = 1, pageSize = 10)=>{
    let offset = 0;
    if(pageIndex == 1) offset = 0;
    if(pageIndex != 1) offset = (pageIndex - 1) * pageSize;
    return sql + ` limit ${offset},${pageSize}`;
}

export let responseJSON = (res, ret) => {
    if (typeof ret === 'undefined') {
        res.json({
            code: '-200', msg: '操作失败'
        });
    } else if(ret.err_code){
        res.json(ret);
    }else{
        ret.err_code = 0;
        res.json(ret);
    }
};

export const formatDate =  (date,fmt) => {
    var o = {
        "M+" : date.getMonth()+1,                 //月份
        "d+" : date.getDate(),                    //日
        "h+" : date.getHours(),                   //小时
        "m+" : date.getMinutes(),                 //分
        "s+" : date.getSeconds(),                 //秒
        "q+" : Math.floor((date.getMonth()+3)/3), //季度
        "S"  : date.getMilliseconds()             //毫秒
    };
    if(/(y+)/.test(fmt))
        fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
    for(var k in o)
        if(new RegExp("("+ k +")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
    return fmt;
};