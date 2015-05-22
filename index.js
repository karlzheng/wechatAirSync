var util = require('util');
var bleno = require('bleno');

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;

console.log('bleno');
var LocaleMACAddr = new Buffer([0x28, 0xE3, 0x47, 0x65, 0x36, 0x39]);

var IndicateCharacteristics = function() {
  IndicateCharacteristics.super_.call(this, {
    uuid: 'fec8',
    properties: ['indicate']
  });
};

util.inherits(IndicateCharacteristics, BlenoCharacteristic);

var updateCallback;
var count = 0;

IndicateCharacteristics.sendData = function() {
    var MagicNumber = 0xfe
        , Ver = 1
        , len = 1
        , CmdId = 10000
        , Seq = count;
    
};

IndicateCharacteristics.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('IndicateCharacteristics subscribe ');
  updateCallback = updateValueCallback;
  count = 1;
  setTimeout(function() {
      var data = new Buffer([0xfe, 0x01, 0x00, 0x26, 0x27, 0x11, 0x00, 0x01, 0x0a, 0x00, 0x12, 0x10, 0x79, 0xa3, 0xb5, 0x9e, 0x72, 0x6a, 0xac, 0x94]); 
          // 0x15, 0x59, 0xcc, 0xbb, 0x1d, 0xe4, 0x2f, 0xdd, 0x18, 0x82, 0x80, 0x04, 0x20, 0x01, 0x28, 0x01, 0x32, 0x00]);
      updateCallback(data);
  }, 1000);
};

IndicateCharacteristics.prototype.onUnsubscribe  = function() {
  console.log('IndicateCharacteristics unsubscribe');
};

IndicateCharacteristics.prototype.onIndicate = function() {
  console.log('IndicateCharacteristics on indicate');
  var data = new Buffer([0x15, 0x59, 0xcc, 0xbb, 0x1d, 0xe4, 0x2f, 0xdd, 0x18, 0x82, 0x80, 0x04, 0x20, 0x01, 0x28, 0x01, 0x32, 0x00]);
  if (count == 1) {
      count = 2;
      updateCallback(data);
  }
};

var WriteCharacteristics = function() {
  WriteCharacteristics.super_.call(this, {
    uuid: 'fec7',
    properties: ['write']
  });
};

util.inherits(WriteCharacteristics, BlenoCharacteristic);

WriteCharacteristics.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log('WriteCharacteristics write request: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse);

  callback(this.RESULT_SUCCESS);
};

var ReadCharacteristics = function() {
  ReadCharacteristics.super_.call(this, {
      uuid: 'fec9',
      properties: ['read'],
      value: LocaleMACAddr,  // 虚拟的MAC地址
  });
};
util.inherits(ReadCharacteristics, BlenoCharacteristic);

function WechatService() {
  WechatService.super_.call(this, {
    uuid: 'fee7',
    characteristics: [
      new WriteCharacteristics(),
      new IndicateCharacteristics(),
      new ReadCharacteristics(),
    ]
  });
}

util.inherits(WechatService, BlenoPrimaryService);

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('Sulong', ['fee7']);
  } else {
    bleno.stopAdvertising();
  }
});

// Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
  console.log('on -> accept, client: ' + clientAddress);

  if (bleno.updateRssi) {
    bleno.updateRssi();
  }
});

bleno.on('disconnect', function(clientAddress) {
  console.log('on -> disconnect, client: ' + clientAddress);
  process.exit();
});

bleno.on('rssiUpdate', function(rssi) {
  console.log('on -> rssiUpdate: ' + rssi);
});
//////////////////////////////////////

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new WechatService(),
    ]);
  }
});

bleno.on('advertisingStop', function() {
  console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function() {
  console.log('on -> servicesSet');
});
