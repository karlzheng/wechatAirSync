// var dcodeIO = require("protobufjs");
// var ProtoBuf = dcodeIO.ProtoBuf;
var Struct = require("struct");
var ProtoBuf = require("protobufjs");
var wechat = ProtoBuf.loadProtoFile("./wechat.proto");
var AuthRequest = wechat.build("AuthRequest");
var AuthResponse = wechat.build("AuthResponse");
var InitRequest = wechat.build("InitRequest"); 
var InitResponse = wechat.build("InitResponse");

var SendDataRequest = wechat.build("SendDataRequest");

var MagicNumber = 0xfe
    , Ver = 1
    , CmdId = 10001
    , Seq = 01;
var PROTOVERSION = 0x010004;

var BpFixHeadStruct = Struct()
	.word8('MagicNumber')
	.word8('Version')
	.word16Ube('Length')
	.word16Ube('CmdId')
	.word16Ube('Seq');

BpFixHeadStruct.allocate();

var BpFixHead = BpFixHeadStruct.buffer();
var BpProxy = BpFixHeadStruct.fields;

var epb_pack_request = function(head, data, cmd) {
    var buf = new Buffer.concat([head, data]);
	BpProxy.MagicNumber = MagicNumber;
	BpProxy.Version = Ver;
	BpProxy.CmdId = cmd;
	BpProxy.Seq = Seq;
	BpProxy.Length = buf.length;
    buf = new Buffer.concat([head, data]);
	CmdId = cmd;
    Seq = Seq + 1;
    // console.log("len=" + buf.length + " " + buf.toString('hex'));
    return buf;
};

var epb_unpack_request = function(data) {
	var len = 0;
	var cmd = 0;
	var seq = 0;
	var respBuf = [];
	for (var i=0; i<BpFixHead.length; i++) {
		BpFixHead[i] = data[i];
	}
	if ((BpProxy.MagicNumber == MagicNumber) && (BpProxy.Version == Ver)) {
		len = BpProxy.Length;
		if (len == data.length) {
			cmd = BpProxy.CmdId;
			seq = BpProxy.Seq;
			respBuf = data.slice(BpFixHead.length);
		} else {
			len = 0;
		}
		// console.log("Len=" + len + " Cmd=" + cmd + " Seq=" + seq + " " + respBuf.toString('hex'));
	}
	return [len, cmd, seq, respBuf];
};

exports.device_auth = function(macaddr, deviceid) {
    var msg = new AuthRequest();
    var bq = new Buffer(0);
    msg.set('BaseRequest', bq);
    msg.set('ProtoVersion', PROTOVERSION);
    msg.set('AuthProto', 1);
    msg.set('MacAddress', macaddr);
    msg.set('DeviceName', deviceid);
    // console.log(msg);
    return epb_pack_request(BpFixHead, msg.encode().toBuffer(), 10001);
};

exports.wechat_resp = function(data) {
	var resp = epb_unpack_request(data);
	var len = resp[0];
	var cmd = resp[1];
	if (len > 0) {
		// var msg = AuthResponse.decode(resp[3]);
		// console.log(msg.get('AesSessionKey'));
	}

	return [cmd, len];
};

exports.device_init = function() {
	var msg = new InitRequest();
    var bq = new Buffer(0);
    msg.set('BaseRequest', bq);
	msg.set('Challenge', "1234");
    // console.log(msg);
    return epb_pack_request(BpFixHead, msg.encode().toBuffer(), 10003);
};

exports.device_SendDataRequest = function() {
	var msg = new SendDataRequest();
    var bq = new Buffer(0);
	msg.set('BaseRequest', bq);
	msg.set('Data', bq);
	var head = new Buffer('fe01000c27120003', 'hex');
	return epb_pack_request(head, msg.encode().toBuffer(), 10004);
};

