(function(root){
'use strict';
// Python 3.10 format(value, spec) for int, float and str.
function cpLen(s){return Array.from(s).length;}
function parseSpec(spec){
  var a=Array.from(spec),i=0,o={fill:null,align:null,sign:null,alt:false,zero:false,width:null,group:null,prec:null,type:null};
  if(a.length>=2&&'<>=^'.indexOf(a[1])>=0){o.fill=a[0];o.align=a[1];i=2;}
  else if(a.length>=1&&'<>=^'.indexOf(a[0])>=0){o.align=a[0];i=1;}
  if(a[i]==='+'||a[i]==='-'||a[i]===' '){o.sign=a[i];i++;}
  if(a[i]==='#'){o.alt=true;i++;}
  if(a[i]==='0'){o.zero=true;i++;}
  var st=i;while(i<a.length&&/[0-9]/.test(a[i]))i++;
  if(i>st)o.width=parseInt(a.slice(st,i).join(''),10);
  if(a[i]===','||a[i]==='_'){o.group=a[i];i++;if(a[i]===','||a[i]==='_')throw new Error("Cannot specify both ',' and '_'.");}
  if(a[i]==='.'){i++;st=i;while(i<a.length&&/[0-9]/.test(a[i]))i++;if(i===st)throw new Error('Format specifier missing precision');o.prec=parseInt(a.slice(st,i).join(''),10);}
  if(i<a.length){ if(a.length-i>1)throw new Error('Invalid format specifier');o.type=a[i];i++;}
  return o;
}
// exact decimal expansion of a finite positive double: returns {digits:'123', exp:e} meaning 0.digits * 10^e  (digits has no leading/trailing zeros) or zero
function exactDecimal(x){
  if(x===0)return {digits:'',exp:0};
  var buf=new DataView(new ArrayBuffer(8));buf.setFloat64(0,x);
  var hi=buf.getUint32(0),lo=buf.getUint32(4),e=(hi>>>20)&0x7ff,m=(BigInt(hi&0xfffff)<<32n)|BigInt(lo);
  if(e===0)e=1;else m|=(1n<<52n);
  var ex=e-1075;
  var num,den=1n;
  if(ex>=0)num=m<<BigInt(ex);else{num=m;den=1n<<BigInt(-ex);}
  // value = num/den. den is power of 2 => finite decimal: multiply by 5^k
  var k=0;if(den>1n){k=Math.log2(Number(den));k=ex<0?-ex:0;num=num*(5n**BigInt(k));}
  var s=num.toString();
  // value = s * 10^-k
  var point=s.length-k;
  var t=s.replace(/0+$/,'');
  return {digits:t,exp:point};
}
// round digit string to n significant digits (n>=0), half-even; returns {digits,exp} with exp adjusted
function roundSig(d,n){
  if(d.digits==='')return {digits:'',exp:0};
  if(n>=d.digits.length)return d;
  var keep=d.digits.slice(0,n),rest=d.digits.slice(n),exp=d.exp;
  var up=false;
  if(rest[0]>'5')up=true;
  else if(rest[0]==='5'){ if(rest.length>1)up=true;else up=(n>0&&(parseInt(keep[n-1],10)%2===1)); if(n===0&&rest.length>1)up=true; }
  var v=BigInt(keep===''?'0':keep);
  if(up){v+=1n;}
  var s=v.toString();
  if(keep===''){ if(!up)return {digits:'',exp:0}; return {digits:'1',exp:exp+1}; }
  if(s.length>keep.length)exp+=1;
  return {digits:s.replace(/0+$/,''),exp:exp};
}
function roundFixed(d,p){
  // round to p digits after decimal point. position of last kept digit index = exp+p
  var n=d.exp+p;
  if(d.digits==='')return {digits:'',exp:0};
  if(n<0)return {digits:'',exp:0};
  return roundSig(d,n);
}
function fixedStr(d,p){
  // d: {digits,exp}; produce string with p decimals
  var digs=d.digits,e=d.exp,ip,fp;
  if(digs===''){ip='0';fp='';}
  else if(e<=0){ip='0';fp='0'.repeat(-e)+digs;}
  else if(e>=digs.length){ip=digs+'0'.repeat(e-digs.length);fp='';}
  else{ip=digs.slice(0,e);fp=digs.slice(e);}
  if(fp.length<p)fp+='0'.repeat(p-fp.length);else fp=fp.slice(0,p);
  return {ip:ip,fp:fp};
}
function expParts(d,p){
  // p digits after point in scientific form; d already rounded to p+1 sig digits
  var digs=d.digits===''?'0':d.digits,e=d.digits===''?0:d.exp-1;
  var m=digs[0],f=digs.slice(1);if(f.length<p)f+='0'.repeat(p-f.length);
  return {m:m,f:f,e:e};
}
function expStr(e){var s=Math.abs(e).toString();if(s.length<2)s='0'+s;return (e<0?'-':'+')+s;}
function shortest(x){ // shortest repr digits via JS
  var s=x.toExponential(),m=s.match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/);
  var digs=(m[1]+(m[2]||'')).replace(/0+$/,'');if(x===0)return {digits:'',exp:0};
  return {digits:digs,exp:parseInt(m[3],10)+1};
}
function group(s,sep,size){var out='';for(var i=s.length;i>0;i-=size){out=s.slice(Math.max(0,i-size),i)+(out?sep+out:'');}return out;}
function grouped(digits,sepc,size,minWidth){
  // zero padded grouping: pad with zeros until grouped length >= minWidth
  var g=group(digits,sepc,size);
  if(minWidth===null||g.length>=minWidth)return g;
  var d=digits;
  while(true){d='0'+d;g=group(d,sepc,size);if(g.length>=minWidth){return g;}}
}
function pad(body,sign,prefix,o,defAlign,isNum,groupInfo){
  // body: digits part (may contain grouping); sign+prefix are kept left of padding for '='
  var align=o.align||defAlign,fill=o.fill!==null?o.fill:' ';
  var total=sign.length+prefix.length+cpLen(body);
  if(o.width===null||total>=o.width)return sign+prefix+body;
  var n=o.width-total,f=function(k){return Array(k+1).join(fill);};
  if(align==='<')return sign+prefix+body+f(n);
  if(align==='>')return f(n)+sign+prefix+body;
  if(align==='^'){var l=Math.floor(n/2);return f(l)+sign+prefix+body+f(n-l);}
  return sign+prefix+f(n)+body;
}
function format(kind,val,spec){
  var o=parseSpec(spec),notes=[];
  var steps=[];
  if(o.zero&&o.fill===null){o.fill='0';if(o.align===null&&kind!=='str')o.align='=';}
  if(kind==='str'){
    if(o.type!==null&&o.type!=='s')throw new Error("Unknown format code '"+o.type+"' for object of type 'str'");
    if(o.sign===' ')throw new Error('Space not allowed in string format specifier');
    if(o.sign!==null)throw new Error('Sign not allowed in string format specifier');
    if(o.alt)throw new Error('Alternate form (#) not allowed in string format specifier');
    if(o.group!==null)throw new Error("Cannot specify '"+o.group+"' with 's'.");
    if(o.align==='=')throw new Error("'=' alignment not allowed in string format specifier");
    var s=val;if(o.prec!==null)s=Array.from(s).slice(0,o.prec).join('');
    return {out:pad(s,'','',o,'<',false),spec:o};
  }
  var isInt=kind==='int',t=o.type,v=val;
  if(isInt){
    if(t===null||t==='d'||t==='n'||t==='b'||t==='o'||t==='x'||t==='X'||t==='c'){
      if(o.prec!==null)throw new Error('Precision not allowed in integer format specifier');
      if(t==='c'){
        if(o.sign!==null)throw new Error("Sign not allowed with integer format specifier 'c'");
        if(o.alt)throw new Error("Alternate form (#) not allowed with integer format specifier 'c'");
        if(o.group!==null)throw new Error("Cannot specify '"+o.group+"' with 'c'.");
        if(v<0n||v>0x10ffffn)throw new Error('%c arg not in range(0x110000)');
        return {out:pad(String.fromCodePoint(Number(v)),'','',o,'>',false),spec:o};
      }
      if(o.group===','&&(t==='b'||t==='o'||t==='x'||t==='X'))throw new Error("Cannot specify ',' with '"+t+"'.");
      if(t==='n'&&o.group!==null)throw new Error("Cannot specify '"+o.group+"' with 'n'.");
      var neg=v<0n,a=neg?-v:v,base={b:2,o:8,x:16,X:16}[t]||10,digs=a.toString(base);
      if(t==='X')digs=digs.toUpperCase();
      var prefix=o.alt&&base!==10?{b:'0b',o:'0o',x:'0x',X:'0X'}[t]:'';
      var sign=neg?'-':(o.sign==='+'?'+':(o.sign===' '?' ':''));
      var gs=o.group?(base===10?3:4):0,body=digs;
      if(o.group){
        var minW=(o.align==='='&&o.fill==='0'&&o.width!==null)?o.width-sign.length-prefix.length:null;
        body=grouped(digs,o.group,gs,minW);
      }
      return {out:pad(body,sign,prefix,o,'>',true),spec:o};
    }
    if('eEfFgG%'.indexOf(t)>=0){var f=Number(v);if(!isFinite(f))throw new Error('int too large to convert to float');return format('float',f,spec);}
    throw new Error("Unknown format code '"+t+"' for object of type 'int'");
  }
  // float
  if(t==='d'||t==='b'||t==='o'||t==='x'||t==='X'||t==='c'||t==='s')throw new Error("Unknown format code '"+t+"' for object of type 'float'");
  if(t!==null&&'eEfFgGn%'.indexOf(t)<0)throw new Error("Unknown format code '"+t+"' for object of type 'float'");
  if(o.type==='n'&&o.group!==null)throw new Error("Cannot specify '"+o.group+"' with 'n'.");
  var x=v,negf=x<0||Object.is(x,-0),ax=Math.abs(x);
  var signf=negf?'-':(o.sign==='+'?'+':(o.sign===' '?' ':''));
  var up=(t==='E'||t==='F'||t==='G');
  if(x!==x||!isFinite(x)||(t==='%'&&!isFinite(ax*100))){
    var w=x!==x?'nan':'inf';if(up)w=w.toUpperCase();
    if(x!==x)signf=(o.sign==='+'?'+':(o.sign===' '?' ':''));
    return {out:pad(w+(t==='%'?'%':''),signf,'',o,'>',true),spec:o};
  }
  var d=exactDecimal(ax),body,pct=false;
  var tt=t==='n'?'g':t;
  if(tt==='%'){pct=true;d=exactDecimal(ax*100);}
  var p=o.prec;
  function doFixed(pp){var r=roundFixed(d,pp),fs=fixedStr(r,pp);var ip=fs.ip;return {ip:ip,fp:fs.fp};}
  function doExp(pp){var r=roundSig(d,pp+1);var ep=expParts(r,pp);return ep;}
  var ipart,fpart,epart='';
  if(tt==='f'||tt==='F'||tt==='%'){
    if(p===null)p=6;var r1=doFixed(p);ipart=r1.ip;fpart=r1.fp;
    if(tt==='%')epart='%';
  }else if(tt==='e'||tt==='E'){
    if(p===null)p=6;var ep=doExp(p);ipart=ep.m;fpart=ep.f;epart=(t==='E'?'E':'e')+expStr(ep.e);
  }else if(tt==='g'||tt==='G'||tt===null){
    var P,reprMode=false;
    if(tt===null&&p===null){reprMode=true;}
    if(reprMode){
      var sd=ax===0?{digits:'',exp:0}:shortest(ax);
      var e10=sd.digits===''?0:sd.exp-1;
      if(e10<-4||e10>=16){ // exponent form, digits as is
        var dg=sd.digits===''?'0':sd.digits;ipart=dg[0];fpart=dg.slice(1);epart='e'+expStr(e10);
      }else{
        var pp2=Math.max(0,(sd.digits===''?0:sd.digits.length-sd.exp));
        var fs2=fixedStr(sd,pp2);ipart=fs2.ip;fpart=fs2.fp;if(fpart==='')fpart='0';
        if(o.alt&&false){}
      }
    }else{
      P=p===null?6:p;if(P===0&&tt!==null)P=1;
      if(tt===null&&P===0)P=1;
      var rr=roundSig(d,P),e10b=rr.digits===''?0:rr.exp-1;
      var useExp=e10b<-4||e10b>=(tt===null?P-1:P);
      if(useExp){
        var ep2=expParts(rr,P-1);ipart=ep2.m;fpart=ep2.f;epart=(t==='G'?'E':'e')+expStr(ep2.e);
        if(!o.alt)fpart=fpart.replace(/0+$/,'');
      }else{
        var fs3=fixedStr(rr,Math.max(0,P-1-e10b));ipart=fs3.ip;fpart=fs3.fp;
        if(!o.alt)fpart=fpart.replace(/0+$/,'');
      }
      if(tt===null&&!useExp&&fpart===''&&!o.alt)fpart='0'; // None type keeps at least one digit after the point
    }
  }
  var numStr=ipart;
  if(o.group){var minW2=(o.align==='='&&o.fill==='0'&&o.width!==null)?o.width-signf.length-(fpart!==''||o.alt?1+fpart.length:0)-epart.length:null;numStr=grouped(ipart,o.group,3,minW2);}
  var tail=(fpart!==''||o.alt?'.'+fpart:'')+epart;
  if(up){tail=tail.toUpperCase();}
  return {out:pad(numStr+tail,signf,'',o,'>',true),spec:o};
}
function describe(o){
  var L=[];
  L.push(['fill',o.fill===null?"(none: space)":JSON.stringify(o.fill)]);
  L.push(['align',o.align===null?'(default)':o.align]);
  L.push(['sign',o.sign===null?'(default: - only)':o.sign]);
  L.push(['#',o.alt?'on':'off']);
  L.push(['0',o.zero?'on':'off']);
  L.push(['width',o.width===null?'(none)':String(o.width)]);
  L.push(['grouping',o.group===null?'(none)':o.group]);
  L.push(['precision',o.prec===null?'(none)':String(o.prec)]);
  L.push(['type',o.type===null?'(none)':o.type]);
  return L;
}
function exactString(x){var d=exactDecimal(Math.abs(x));if(d.digits==='')return '0';var fs=fixedStr(d,Math.max(0,d.digits.length-d.exp));return (x<0?'-':'')+fs.ip+(fs.fp?'.'+fs.fp:'');}
var api={exactString:exactString,parseSpec:parseSpec,format:format,describe:describe,exactDecimal:exactDecimal};
if(typeof module!=='undefined')module.exports=api;else root.PyFormat=api;
})(this);
