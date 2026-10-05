// node test-engine.js SEED N   compares the engine with Python 3.10 format()
var P=require('./engine.js'),cp=require('child_process');
var seed=+process.argv[2]||1,N=+process.argv[3]||5000;
function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function pick(a){return a[Math.floor(rnd()*a.length)];}
var ints=['0','1','-1','7','42','255','-255','1234','-1234','1234567','-98765432','1000000','65','8364','128512','9007199254740993','-9007199254740993','123456789012345678901234567890','4','10'];
var floats=['0','-0','0.5','1.5','2.5','3.5','0.125','0.375','1','-1','3.14159','-2.71828','1234.5678','0.0001','0.00001234','123456789.123456789','1e16','1e15','123456789012345680','1e22','1e-7','5e-324','1.7976931348623157e308','0.1','0.3','99.995','9.995','0.05','2.675','1e100','nan','inf','-inf','100','1234567.891','0.000123456','99999.95','999999.5'];
var strs=['','a','hello','h\u00e9llo','\u4e2d\u6587','a b','\ud83d\ude00x','0123','-5'];
function randFloat(){var t=rnd();if(t<.5)return pick(floats);var e=Math.floor(rnd()*40)-20,m=(rnd()*2-1)*10;var x=m*Math.pow(10,e);return String(x);}
function spec(){
  var s='',r=rnd();
  if(rnd()<.35){var al=pick(['<','>','=','^']);if(rnd()<.6)s+=pick(['*','0','x',' ','-','\u00e9','#','<'])+al;else s+=al;}
  if(rnd()<.3)s+=pick(['+','-',' ']);
  if(rnd()<.2)s+='#';
  if(rnd()<.2)s+='0';
  if(rnd()<.55)s+=String(Math.floor(rnd()*14));
  if(rnd()<.2)s+=pick([',','_']);
  if(rnd()<.45)s+='.'+Math.floor(rnd()*9);
  if(rnd()<.85)s+=pick(['d','d','b','o','x','X','c','s','e','E','f','F','g','G','%','n','f','f','e','g','',' ','z']);
  return s;
}
function num(s){return s==='inf'?Infinity:s==='-inf'?-Infinity:s==='nan'?NaN:Number(s);}
var cases=[];
for(var i=0;i<N;i++){
  var k=pick(['int','int','float','float','float','str']);
  var v=k==='int'?pick(ints):k==='float'?randFloat():pick(strs);
  cases.push([k,v,spec()]);
}
var res=JSON.parse(cp.execSync('python3 oracle.py',{input:JSON.stringify(cases),maxBuffer:1<<28}));
var okEq=0,errBoth=0,bad=0,shown=0,cat={};
cases.forEach(function(c,i){
  var py=res[i],mine;
  try{var val=c[0]==='int'?BigInt(c[1]):c[0]==='float'?num(c[1]):c[1];mine={ok:true,out:P.format(c[0],val,c[2]).out};}
  catch(e){mine={ok:false,out:e.message};}
  var key=c[0]+(mine.ok?'':'-err');
  if(py[0]&&mine.ok){if(py[1]===mine.out)okEq++;else{bad++;cat.valueDiff=(cat.valueDiff||0)+1;if(shown++<10)console.log('VAL',JSON.stringify(c),'mine',JSON.stringify(mine.out),'py',JSON.stringify(py[1]));}}
  else if(!py[0]&&!mine.ok)errBoth++;
  else{bad++;var kk=py[0]?'engineErrorPythonOk':'pythonErrorEngineOk';cat[kk]=(cat[kk]||0)+1;if(shown++<10)console.log(kk,JSON.stringify(c),'mine',JSON.stringify(mine.out),'py',JSON.stringify(py[1]));}
});
console.log(JSON.stringify({seed:+process.argv[2],cases:N,sameOutput:okEq,bothErrored:errBoth,mismatches:bad,cat:cat}));
