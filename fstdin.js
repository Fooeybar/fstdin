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
    if(config!==stdconst)for(let i in stdconst)if(config[i]===undefined||typeof(config[i])!==typeof(stdconst[i]))config[i]=stdconst[i];
    let Emitter=require("events").EventEmitter;
    if((config.process instanceof Emitter&&typeof(config.process.exit)==='function')
    &&(config.process.stdout instanceof Emitter&&typeof(config.process.stdout.write)==='function')
    &&(config.process.stdin instanceof Emitter&&typeof(config.process.stdin.read)==='function')){
        let clrf=(int=0)=>(0<=int&&int<256)?`${config.escape}[38;5;${int}m`:config.escape+'[0m';
        let clrb=(int=0)=>(0<=int&&int<256)?`${config.escape}[48;5;${int}m`:config.escape+'[0m';
        //===========================================================================================================
        let disp=clrb(config.cursorClr)+' '+config.escape+'[0m',clear=config.escape+'[2K',hist=[''],hpos=0,prmt=[],ppos=-1,keyflag=false
            ,std={line:'',undo:[''],upos:0},prm={line:'',undo:[''],upos:0};
        let curr=std,proot=undefined;
        //===========================================================================================================
        let render=(before=false)=>{
            if(!keyflag){
                let extclear=0,extcolumns=0;
                disp='';
                if(-1<ppos){
                    curr=prm;
                    let pline=prmt[ppos].line;
                    if(prmt[ppos].new>1){
                        for(let i=prmt[ppos].newpos.length-1,oldpos=i;i>=0;i--){
                            let temppos=prmt[ppos].newpos[i]-oldpos;
                            let num=Math.floor((temppos)/(config.process.stdout.columns-1));
                            extclear+=num;
                            oldpos=prmt[ppos].newpos[i];
                        }
                        if(config.process.stdout.columns-1<=pline.length-prmt[ppos].newpos[0]+curr.line.length)extcolumns=pline.length-prmt[ppos].newpos[0];
                    }
                    else if(config.process.stdout.columns-1<=prmt[ppos].line.length){
                        let last=0;
                        pline='';
                        for(let i=0,mark=0;i<prmt[ppos].line.length;i++){
                            if(i-mark===config.process.stdout.columns-1){
                                pline+='\n';
                                extclear++;
                                mark=i;
                                last=0;
                            }
                            pline+=prmt[ppos].line[i];
                            last++;
                        }
                        if(config.process.stdout.columns-1<=last+curr.line.length)extcolumns=last;
                    }
                    else if(config.process.stdout.columns-1<=pline.length+curr.line.length)extcolumns=pline.length;
                    disp=clrf(prmt[ppos].font||config.textClr)+pline;
                }
                else curr=std;
                disp+=clrf(config.textClr)
                    +((config.process.stdout.columns-extcolumns-1>curr.line.length)?curr.line:curr.line.substring(curr.line.length-config.process.stdout.columns+1+extcolumns))
                    +clrb(config.cursorClr)+' '+config.escape+'[0m';
                setUndo();
                if(curr.line.length>0&&hpos===hist.length-1)hist[hist.length-1]=curr.line;
                config.line=curr.line;
                if(before===true){
                    config.process.stdout.write(clrf(config.textClr)+hist[hist.length-2]+'\n',(err)=>{
                        if(err)console.error(err);
                        else{
                            if(typeof(config.onLine)==='function')config.onLine(hist[hist.length-2]);
                            setClear((-1<ppos)?prmt[ppos].new+extclear:1);
                        }
                    });
                }
                else config.process.stdout.write('',(err)=>{
                    if(err)console.error(err);
                    else setClear((-1<ppos)?prmt[ppos].new+extclear:1);
                });
            }
        };
        let setClear=(int)=>{
            clear=config.escape+'[2K';
            while(1<int--)clear+=config.escape+'[1A'+config.escape+'[2K';
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
            let out=0;
            for(let i=0;i<queries.length;i++){
                if(typeof(queries[i])==='object'&&typeof(queries[i].line)==='string'
                    &&queries[i].line.length>0){
                     queries[i].any=(typeof(queries[i].func)==='function')?false:true;
                     queries[i].new=1;
                     queries[i].newpos=[];
                     for(let j=queries[i].line.length-1;j>=0;j--)if(queries[i].line[j]==='\n'){queries[i].new++;queries[i].newpos[queries[i].newpos.length++]=j;}
                     if(queries[i].root===true){proot=queries[i];prmt[prmt.length++]=queries[i];}
                     else prmt[prmt.length++]=queries[i];
                     out++;
                 }
            }
            if(prmt.length>0){
                if(ppos===-1)ppos=0;
                else if(prmt[ppos]===proot){
                    ppos++;
                    prm={line:'',undo:[''],upos:0};
                }
                render();
            }
            return out;
        };
        let popPrompt=(esc=false)=>{
            let line=prm.line;
            prm={line:'',undo:[''],upos:0};
            if((!esc&&typeof(prmt[ppos].func)==='function'))prmt[ppos].func(line);
            if(++ppos===prmt.length){
                prmt.length=0;
                if(proot!==undefined){
                    prmt[prmt.length++]=proot;
                    ppos=0;
                }
                else ppos=-1;
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
            if/*ctrl+c*/(key.name==='c'&&key.ctrl===true&&key.meta===false&&key.shift===false)config.process.exit();
            else if(ppos>-1&&prmt[ppos].any===true)popPrompt();
            else/*up*/if(key.name==='up'&&key.ctrl===false&&key.meta===false&&key.shift===false)scrollHist(-1);
            else/*down*/if(key.name==='down'&&key.ctrl===false&&key.meta===false&&key.shift===false)scrollHist(1);
            else/*ctrl+z*/if(key.name==='z'&&key.ctrl===true&&key.meta===false&&key.shift===false)redo(-1);
            else/*ctrl+y*/if(key.name==='y'&&key.ctrl===true&&key.meta===false&&key.shift===false)redo(1);
            else/*escape*/if(key.name==='escape'&&key.ctrl===false&&key.shift===false){
                if(prmt.length>0)popPrompt(true);
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
                    if(hist.length>config.history+1)hist.splice(0,hist.length-config.history-1);
                }
                if(ppos>-1)popPrompt();
                else if(curr.line.length>0){
                        curr.line='';
                        curr.upos=0;
                        curr.undo=[''];
                        render(true);
                    }
                else if(typeof(config.onLine)==='function')config.onLine('');
            }
            else if(key.sequence.length===1){
                curr.line+=key.sequence;
                render();
            }
            if(curr===std)config.line=curr.line;
            if(ch!==undefined&&typeof(config.onKey)==='function')config.onKey(key);
        };
        //===========================================================================================================
        if(config.process.stdout.fwrite===undefined)config.process.stdout.fwrite=config.process.stdout.write;
        config.process.stdout.write=function(chunk,encoding,cb){
            config.process.stdout.fwrite(clear+config.escape+`[${config.process.stdout.columns}D`+chunk+disp+''+config.escape+'[0m',encoding,cb);
        };
        if(config.process.fexit===undefined)config.process.fexit=config.process.exit;
        config.process.exit=function(code){
            if(typeof(config.onExit)==='function')config.onExit(code);
            config.process.stdout.fwrite(clear+config.escape+`[${config.process.stdout.columns}D${config.escape}[0m${config.escape}[?25h`,null,()=>config.process.fexit(code));
        };
        require('readline').emitKeypressEvents(config.process.stdin);
        if(config.process.stdin.isTTY)config.process.stdin.setRawMode(true);
        config.process.stdin.removeListener('keypress',keyme);
        config.process.stdin.on('keypress',keyme);
        //===========================================================================================================
        config.process.stdout.write(config.escape+'[?25l'+config.escape+'[30m\033]0;fstdin\007');
        config.key=function(key={name:'',sequence:'',ctrl:false,meta:false,shift:false}){
            keyflag=true;
            for(let i=0;i<arguments.length;i++){
                if(i===arguments.length-1)keyflag=false;
                keyme(arguments[i]);
            }
        };
        config.prompt=function(query={line:'',font:config.textClr,func:(res)=>{}}){
            return promptme(Array.from(arguments));
        };
        config.font=function(int=0){return clrf(int);}
        config.back=function(int=0){return clrb(int);}
        return config;
    }
};
//================================================================================================================sdg
module.exports=function(config=stdconst){return fstdin(config);}
