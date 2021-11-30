const stdconst={
    process:process
   ,textClr:15
   ,cursorClr:8
   ,history:100
   ,escape:'\x1b'
   ,onExit:function(code=0){}
   ,onLine:function(line=''){}
   ,onKey:function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false}){}
};
const fstdin=(config=stdconst)=>{
    let conf=stdconst;
    if(config!==stdconst)for(let i in stdconst)conf[i]=(config[i]===undefined||typeof(config[i])!==typeof(stdconst[i]))?stdconst[i]:config[i];
    let Emitter=require("events").EventEmitter;
    if((conf.process instanceof Emitter&&typeof(conf.process.exit)==='function')
    &&(conf.process.stdout instanceof Emitter&&typeof(conf.process.stdout.write)==='function')
    &&(conf.process.stdin instanceof Emitter&&typeof(conf.process.stdin.read)==='function')){
        let clrf=(int=0)=>(0<=int&&int<256)?`${conf.escape}[38;5;${int}m`:conf.escape+'[0m';
        let clrb=(int=0)=>(0<=int&&int<256)?`${conf.escape}[48;5;${int}m`:conf.escape+'[0m';
        //===========================================================================================================
        let disp=clrb(conf.cursorClr)+' '+conf.escape+'[0m',clear=conf.escape+'[2K',hist=[''],hpos=0,prmt=[],ppos=-1
            ,std={line:'',undo:[''],upos:0},prm={line:'',undo:[''],upos:0};
        let curr=std;
        //===========================================================================================================
        let render=(before=false)=>{
            let extclear=0,extcolumns=0;
            disp='';
            if(-1<ppos){
                curr=prm;
                let pline=prmt[ppos].line;
                if(prmt[ppos].new>1){
                    for(let i=prmt[ppos].newpos.length-1,oldpos=i;i>=0;i--){
                        let temppos=prmt[ppos].newpos[i]-oldpos;
                        let num=Math.floor((temppos)/(conf.process.stdout.columns-1));
                        extclear+=num;
                        oldpos=prmt[ppos].newpos[i];
                    }
                    if(conf.process.stdout.columns-1<=pline.length-prmt[ppos].newpos[0]+curr.line.length)extcolumns=pline.length-prmt[ppos].newpos[0];
                }
                else if(conf.process.stdout.columns-1<=prmt[ppos].line.length){
                    let last=0;
                    pline='';
                    for(let i=0,mark=0;i<prmt[ppos].line.length;i++){
                        if(i-mark===conf.process.stdout.columns-1){
                            pline+='\n';
                            extclear++;
                            mark=i;
                            last=0;
                        }
                        pline+=prmt[ppos].line[i];
                        last++;
                    }
                    if(conf.process.stdout.columns-1<=last+curr.line.length)extcolumns=last;
                }
                else if(conf.process.stdout.columns-1<=pline.length+curr.line.length)extcolumns=pline.length;
                disp=pline;
            }
            else curr=std;
            disp+=clrf(conf.textClr)
                +((conf.process.stdout.columns-extcolumns-1>curr.line.length)?curr.line:curr.line.substring(curr.line.length-conf.process.stdout.columns+1+extcolumns))
                +clrb(conf.cursorClr)+' '+conf.escape+'[0m';
            setUndo();
            if(curr.line.length>0&&hpos===hist.length-1)hist[hist.length-1]=curr.line;
            conf.line=curr.line;
            if(before===true){
                conf.process.stdout.write(clrf(conf.textClr)+hist[hist.length-2]+'\n',(err)=>{
                    if(err)console.error(err);
                    else{
                        if(typeof(conf.onLine)==='function')conf.onLine(hist[hist.length-2]);
                        setClear((-1<ppos)?prmt[ppos].new+extclear:1);
                    }
                });
            }
            else conf.process.stdout.write('',(err)=>{
                if(err)console.error(err);
                else setClear((-1<ppos)?prmt[ppos].new+extclear:1);
            });
        };
        let setClear=(int)=>{
            clear=''+conf.escape+'[2K';
            while(1<int--)clear+=''+conf.escape+'[1A'+conf.escape+'[2K';
        };
        let scrollHist=(int)=>{
            hpos+=int;
            if(hpos<0)hpos=0;
            else if(hist.length-1<hpos)hpos=hist.length-1;
            curr.line=hist[hpos];
            render();
        };
        let setUndo=()=>{
            if(hpos<hist.length-1){if(curr.line!==hist[hpos])curr.undo[++curr.upos]=curr.line;}
            else{if(curr.line!==curr.undo[curr.upos])curr.undo[++curr.upos]=curr.line;}
        };
        let redo=(int)=>{
            curr.upos+=int;
            if(curr.undo.length-1<curr.upos)curr.upos=curr.undo.length-1;
            else if(curr.upos<0)curr.upos=0;
            curr.line=curr.undo[curr.upos];
            hpos=hist.length-1;
            render();
        };
        let promptme=(queries=[])=>{
            for(let i=0;i<queries.length;i++)
                if(typeof(queries[i])==='object'&&typeof(queries[i].line)==='string'
                    &&queries[i].line.length>0){
                     let obj={
                         line:queries[i].line
                         ,any:(typeof(queries[i].func)==='function')?false:true
                         ,func:queries[i].func
                         ,new:1
                         ,newpos:[]
                     };
                     for(let j=obj.line.length-1;j>=0;j--)if(obj.line[j]==='\n'){obj.new++;obj.newpos[obj.newpos.length++]=j;}
                     prmt[prmt.length++]=obj;
                 }
            if(prmt.length>0&&ppos===-1){
                ppos=0;
                render();
            }
        };
        let popPrompt=()=>{
            if(typeof(prmt[ppos].func)==='function')prmt[ppos].func(prm.line);
            prm={line:'',undo:[''],upos:0};
            if(++ppos===prmt.length){
                ppos=-1;
                prmt.length=0;
            }
            render();
        };
        let keyme=(ch,key)=>{
            if(key===undefined){
                if(typeof(ch)==='string'||typeof(ch)==='number')key={name:''+ch,sequence:''+ch,ctrl:false,meta:false,shift:false};
                else if(typeof(ch)==='object'){
                    key=ch;
                    if(key.ctrl===undefined)key.ctrl=false;
                    if(key.meta===undefined)key.meta=false;
                    if(key.shift===undefined)key.shift=false;
                }
                ch=undefined;
            }
            if/*ctrl+c*/(key.name==='c'&&key.ctrl===true&&key.meta===false&&key.shift===false)conf.process.exit();
            else if(ppos>-1&&prmt[ppos].any===true)popPrompt();
            else/*up*/if(key.name==='up'&&key.ctrl===false&&key.meta===false&&key.shift===false)scrollHist(-1);
            else/*down*/if(key.name==='down'&&key.ctrl===false&&key.meta===false&&key.shift===false)scrollHist(1);
            else/*ctrl+z*/if(key.name==='z'&&key.ctrl===true&&key.meta===false&&key.shift===false)redo(-1);
            else/*ctrl+y*/if(key.name==='y'&&key.ctrl===true&&key.meta===false&&key.shift===false)redo(1);
            else/*escape*/if(key.name==='escape'&&key.ctrl===false&&key.meta===true&&key.shift===false){
                if(prmt.length>0)popPrompt();
                else{
                    curr.line=curr.undo[curr.upos];
                    hpos=hist.length-1;
                    render();
                }
            }
            else/*backspace*/if(key.name==='backspace'&&key.ctrl===false&&key.meta===false&&key.shift===false){
                if(prmt.length===0&&hpos<hist.length-1){
                    curr.line=hist[hpos];
                    hpos=hist.length-1;
                }
                if(curr.line.length>0){
                    curr.line=curr.line.substring(0,curr.line.length-1);
                    setUndo();
                    render();
                }
            }
            else/*return*/if(key.name==='return'&&key.ctrl===false&&key.meta===false&&key.shift===false){
                hpos=hist.length-1;
                if(curr.line.length>0&&hist[hist.length-2]!==curr.line){
                    hist[hpos++]=curr.line;
                    hist[hpos]='';
                    if(hist.length>conf.history)hist.splice(0,1);
                }
                if(ppos>-1)popPrompt();
                else if(curr.line.length>0){
                        curr.line='';
                        curr.upos=0;
                        curr.undo=[''];
                        render(true);
                    }
                else if(typeof(conf.onLine)==='function')conf.onLine('');
            }
            else if(key.sequence.length===1){
                curr.line+=key.sequence;
                render();
            }
            if(curr===std)conf.line=curr.line;
            if(ch!==undefined&&typeof(conf.onKey)==='function')conf.onKey(key);
        };
        //===========================================================================================================
        if(conf.process.stdout.fwrite===undefined)conf.process.stdout.fwrite=conf.process.stdout.write;
        conf.process.stdout.write=function(chunk,encoding,cb){
            conf.process.stdout.fwrite(clear+conf.escape+`[${conf.process.stdout.columns}D`+chunk+disp+''+conf.escape+'[0m',encoding,cb);
        };
        if(conf.process.fexit===undefined)conf.process.fexit=conf.process.exit;
        conf.process.exit=function(code){
            if(typeof(conf.onExit)==='function')conf.onExit(code);
            conf.process.stdout.fwrite(clear+conf.escape+`[${conf.process.stdout.columns}D${conf.escape}[0m${conf.escape}[?25h`,null,()=>conf.process.fexit(code));
        };
        require('readline').emitKeypressEvents(conf.process.stdin);
        if(conf.process.stdin.isTTY)conf.process.stdin.setRawMode(true);
        conf.process.stdin.removeListener('keypress',keyme);
        conf.process.stdin.on('keypress',keyme);
        //===========================================================================================================
        conf.process.stdout.write(conf.escape+'[?25l'+conf.escape+'[30m\033]0;fstdin\007');
        conf.key=function(key={name:'',sequence:'',ctrl:false,meta:false,shift:false}){
                for(let i=0;i<arguments.length;i++)keyme(arguments[i]);
        };
        conf.prompt=function(query={line:'',any:false,func:(res)=>{}}){
            promptme(Array.from(arguments));
        };
        conf.font=function(int=0){return clrf(int);}
        conf.back=function(int=0){return clrb(int);}
        return conf;
    }
};
//================================================================================================================sdg
module.exports=function(config=stdconst){return fstdin(config);}
