var ProtoBuf = require("protobufjs");
var wechat = ProtoBuf.loadProtoFile( "./wechat.proto"),
    AuthRequest = wechat.build("AuthRequest");
var MagicNumber = 0xfe
    , Ver = 1
    , CmdId = 10001
    , Seq = 01;
var BpFixHead = new Buffer([MagicNumber, Ver, 0, 0, 0, 0, 0, 0]);
var bq = new Buffer(0);
var PROTOVERSION = 0x010004;

var writebufferhex = function(buf, val, offset, len) {
    for (var i=0; i<len; i++) {
        buf[offset + len - 1 - i] = (val & 0xff);
        val = val / 256;
    }
};

var epb_pack_request = function(head, data) {
    var buf = new Buffer.concat([head, data]);
    writebufferhex(buf, buf.length, 2, 2);
    writebufferhex(buf, CmdId, 4, 2);
    writebufferhex(buf, Seq, 6, 2);
    Seq = Seq + 1;
    // console.log(buf);
    return buf;
};

exports.device_auth = function(macaddr, deviceid) {
    var msg = new AuthRequest();
    var msg = new AuthRequest();
    msg.set('BaseRequest', bq);
    msg.set('ProtoVersion', PROTOVERSION);
    msg.set('AuthProto', 1);
    msg.set('MacAddress', macaddr);
    msg.set('DeviceName', deviceid);
    // console.log(msg);
    return epb_pack_request(BpFixHead, msg.encode().toBuffer());
};
