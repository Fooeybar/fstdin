const {emitKeypressEvents}=require('readline'),{formatWithOptions}=require('util'),{appendFile}=require('fs'),Emitter=require("events").EventEmitter;
const clrF=(int)=>{
    int=(int!=='rand'||int!=='random')?parseInt(int):Math.floor(Math.random()*255);
    if(int!==undefined&&int>=0&&int<256)return `\x1b[38;5;${int}m`;
    return '';
};
const clrB=(int)=>{
    int=(int!=='rand'||int!=='random')?parseInt(int):Math.floor(Math.random()*255);
    if(int!==undefined&&int>=0&&int<256)return  `\x1b[48;5;${int}m`;
    return '';
};
const numbers=['0','1','2','3','4','5','6','7','8','9'];
const keyconf={sequence:'',name:'',ctrl:false,meta:false,shift:false,func:function noop(){}};
const cmdconf={name:'',about:'',func:function(){}};
const stdconf={
    process:process
    ,stdout:process.stdout
    ,stdin:process.stdin
    ,tag:'fstdin> '
    ,tagClr:2
    ,tagClrBack:-1
    ,textClr:7
    ,textClrBack:-1
    ,cmdsClr:4
    ,cmdsClrBack:-1
    ,cmdsValueClr:11
    ,cmdsValueClrBack:-1
    ,flagAbout:'-a'
    ,flagSubCmds:'-s'
    ,flagInsert:'-i'
    ,aboutBullet:' └ '
    ,aboutBulletClr:11
    ,aboutBulletClrBack:-1
    ,aboutTextClr:7
    ,aboutTextClrBack:-1
    ,systemPrefix:'.'
    ,maxEntries:100
    ,showCursor:true
    ,displayCmdCall:true
    ,exitOnError:false
    ,onExit:function(code){}
    ,file:''
    ,nullHelpMsg:true
};
const stdin=(conf=stdconf)=>{
    if(conf!==stdconf){
        if(conf.process){
            if(conf.stdout===undefined)conf.stdout=conf.process.stdout;
            if(conf.stdin===undefined)conf.stdin=conf.process.stdin;
        }
        for(let i in stdconf)if(conf[i]===undefined)conf[i]=stdconf[i];
    }
    //===========================================================================================================
    if((conf.process instanceof Emitter&&typeof(conf.process.exit)==='function')
    &&(conf.stdout instanceof Emitter&&typeof(conf.stdout.write)==='function')
    &&(conf.stdin instanceof Emitter&&typeof(conf.stdin.read)==='function')){
        let config={};for(let i in conf)config[i]=conf[i];
        //===========================================================================================================
        let cmds=[],cmdsLock=0;
        let getCmd=(string)=>{
            let ret=undefined,chain=string.trim().split(' '),arr=cmds,br=ret;
            for(let i=0;i<chain.length;i++){
                for(let ii=0;ii<arr.length;ii++)if(chain[i]===arr[ii].name){if(ret!==undefined)ret.ext='';ret=arr[ii];}
                if(ret===undefined)break;
                arr=ret.subcmds||[];
                ret.ext='';
                if(br!==ret)br=ret;
                else{for(let ii=i;ii<chain.length;ii++){ret.ext+=chain[ii];if(ii<chain.length-1)ret.ext+=' ';}break;}
            }
            return ret;
        };
        let cmd=(ext)=>{
            let opt=ext.indexOf(config.flagAbout),about=false,subs=false,tostdin=false,msg='';
            if(opt>-1){
                about=true;
                let temp=ext;
                ext=temp.substring(0,opt);
                ext+=temp.substring(opt+config.flagAbout.length+1);
            }
            opt=ext.indexOf(config.flagSubCmds);
            if(opt>-1){
                subs=true;
                let temp=ext;
                ext=temp.substring(0,opt);
                ext+=temp.substring(opt+config.flagSubCmds.length+1);
            }
            opt=ext.indexOf(config.flagInsert);
            if(opt>-1){
                tostdin=true;
                let temp=ext;
                ext=temp.substring(0,opt);
                ext+=temp.substring(opt+config.flagInsert.length+1);
            }
            ext=ext.trim();
            let cmd=getCmd(ext);
            if(cmd!==undefined){
                if(config.displayCmdCall===true){
                    msg=clrF(config.cmdsClr)+clrB(config.cmdsClrBack);
                    if(cmd.ext!=='')msg+=ext.replace(cmd.ext,'')+clrF(config.cmdsValueClr)+clrB(config.cmdsValueClrBack)+cmd.ext;
                    else msg+=ext;
                    if(cmd.ext!=='')msg+='\n';
                    config.stdout.write(msg+'\x1b[0m');
                }
                cmd.func(cmd.ext,about,subs,tostdin);
                updateDisplay();
            }
            else{
                let recur=(arr,name)=>{
                    for(let i=0;i<arr.length;i++){
                        if(ext===''||ext===config.systemPrefix||arr[i].name.substring(0,ext.length)===ext){
                            if(msg!=='')msg+='\n';
                            msg+=clrF(config.cmdsClr)+clrB(config.cmdsClrBack)+name+' '+arr[i].name;
                            if(tostdin===true){
                                if(last[0]==='')last[0]=name+' '+arr[i].name;
                                else last.unshift(name+' '+arr[i].name);
                            }
                            if(about===true&&arr[i].about!=='')msg+='\n'+clrF(config.aboutBulletClr)+clrB(config.aboutBulletClrBack)+config.aboutBullet+clrF(config.aboutTextClr)+clrB(config.aboutTextClrBack)+arr[i].about;
                        }
                        if(arr[i].subcmds.length>0)recur(arr[i].subcmds,name+' '+arr[i].name);
                    }
                };
                for(let i=0;i<cmds.length;i++){
                    if(cmds[i].name[0]===config.systemPrefix&&(ext===''||ext[0]!==config.systemPrefix))continue;
                    if(cmds[i].name.substring(0,ext.length)===ext||ext===''){
                        if(msg!=='')msg+='\n';
                        msg+=clrF(config.cmdsClr)+clrB(config.cmdsClrBack)+cmds[i].name;
                        if(tostdin===true){
                            if(last[0]==='')last[0]=cmds[i].name;
                            else last.unshift(cmds[i].name);
                        }
                        if(about===true&&cmds[i].about!=='')msg+='\n'+clrF(config.aboutBulletClr)+clrB(config.aboutBulletClrBack)+config.aboutBullet+clrF(config.aboutTextClr)+clrB(config.aboutTextClrBack)+cmds[i].about;
                    }
                    if(cmds[i].subcmds.length>0&&subs===true)recur(cmds[i].subcmds,cmds[i].name);
                }
                if(tostdin===true)last.unshift('');
                if(msg!==''){config.stdout.write(msg+'\x1b[0m\n');}
            }
        };
        let addCmd=(obj)=>{
            if(typeof(obj)==='object'&&typeof(obj.name)==='string'){
                obj.name=obj.name.trim();
                if(obj.name!==''){
                    if(typeof(obj.about)!=='string')obj.about=cmdconf.about;
                    obj.subcmds=[];
                    let cmd=getCmd(obj.name),spc=-1,ext='';
                    let func=(temp,tempfunc)=>{
                        return function(ext,about,subs,tostdin){
                            if(ext===''){
                                if(about===false&&subs===false&&tostdin===false)tempfunc(ext);
                                else{
                                    let tempmsg='';
                                    if(about===true){
                                        tempmsg=clrF(config.cmdsClr)+clrB(config.cmdsClrBack)+temp.name;
                                        if(temp.about!=='')tempmsg+='\n'+clrF(config.aboutBulletClr)+clrB(config.aboutBulletClrBack)+config.aboutBullet+clrF(config.aboutTextClr)+clrB(config.aboutTextClrBack)+temp.about;
                                    }
                                    if(tostdin===true){
                                        if(last[0]==='')last[0]=temp.name;
                                        else last.unshift(temp.name);
                                    }
                                    if(subs===true&&temp.subcmds.length>0){
                                        let recur=(arr,name)=>{
                                            for(let i=0;i<arr.length;i++){
                                                if(tempmsg!=='')tempmsg+='\n';
                                                tempmsg+=clrF(config.cmdsClr)+clrB(config.cmdsClrBack)+name+' '+arr[i].name;
                                                if(tostdin===true){
                                                    if(last[0]==='')last[0]=name+' '+arr[i].name;
                                                    else last.unshift(name+' '+arr[i].name);
                                                }
                                                if(about===true&&arr[i].about!=='')tempmsg+='\n'+clrF(config.aboutBulletClr)+clrB(config.aboutBulletClrBack)+config.aboutBullet+clrF(config.aboutTextClr)+clrB(config.aboutTextClrBack)+arr[i].about;
                                                if(arr[i].subcmds.length>0)recur(arr[i].subcmds,name+' '+arr[i].name);
                                            }
                                        };
                                        for(let i=0;i<temp.subcmds.length;i++){
                                            if(tempmsg!=='')tempmsg+='\n';
                                            tempmsg+=clrF(config.cmdsClr)+clrB(config.cmdsClrBack)+temp.name+' '+temp.subcmds[i].name;
                                            if(tostdin===true){
                                                if(last[0]==='')last[0]=temp.name+' '+temp.subcmds[i].name;
                                                else last.unshift(temp.name+' '+temp.subcmds[i].name);
                                            }
                                            if(about===true&&temp.subcmds[i].about!=='')tempmsg+='\n'+clrF(config.aboutBulletClr)+clrB(config.aboutBulletClrBack)+config.aboutBullet+clrF(config.aboutTextClr)+clrB(config.aboutTextClrBack)+temp.subcmds[i].about;
                                            if(temp.subcmds[i].subcmds.length>0)recur(temp.subcmds[i].subcmds,temp.name+' '+temp.subcmds[i].name);
                                        }
                                    }
                                    if(tostdin===true)last.unshift('');
                                    if(tempmsg!==''){
                                        config.stdout.write(tempmsg+'\x1b[0m\n');
                                    }
                                }
                            }
                            else tempfunc(ext);
                        };
                    };
                    if(cmd===undefined){//new tree
                        spc=obj.name.indexOf(' ');
                        if(spc>-1){
                            ext=obj.name.substring(spc+1).trim();
                            obj.name=obj.name.substring(0,spc);
                        }
                        if(ext===''){
                            obj.func=func(obj,(typeof(obj.func)==='function')?obj.func:cmdconf.func);
                            obj.ext=ext;
                            cmds.push(obj);
                        }
                        else{
                            let tempobj={name:obj.name,about:cmdconf.about,subcmds:[],ext:''};
                            tempobj.func=func(tempobj,cmdconf.func);
                            cmds.push(tempobj);
                            obj.name=obj.name+' '+ext;
                            addCmd(obj);
                        }
                    }
                    else if(cmd.ext!==''){//add branch
                        obj.name=cmd.ext;
                        cmd.ext='';
                        spc=obj.name.indexOf(' ');
                        if(spc>-1){
                            ext=obj.name.substring(spc+1).trim();
                            obj.name=obj.name.substring(0,spc);
                        }
                        if(ext===''){
                            obj.func=func(obj,(typeof(obj.func)==='function')?obj.func:cmdconf.func);
                            obj.ext=ext;
                            cmd.subcmds.push(obj);
                        }
                        else{
                            let tempobj={name:obj.name,about:cmdconf.about,subcmds:[],ext:''};
                            tempobj.func=func(tempobj,cmdconf.func);
                            cmd.subcmds.push(tempobj);
                            obj.name=cmd.name+' '+obj.name+' '+ext;
                            addCmd(obj);
                        }
                    }
                }
            }
        };        
        let delCmd=(string)=>{
            if(typeof(string)==='string'){
                string=string.trim();
                if(string!==''){
                    let ret=false;
                    let recur=(arr,name)=>{
                        for(let i=0;!ret&&i<arr.length;i++){
                            if(name+stdconf.cmdPathSeparator+arr[i].name===string){arr.splice(i,1);ret=true;break;}
                            if(arr[i].subcmds.length>0)recur(arr[i].subcmds,name+stdconf.cmdPathSeparator+arr[i].name);
                        }
                    };
                    for(let i=cmdsLock;!ret&&i<cmds.length;i++){
                        if(cmds[i].name===string){cmds.splice(i,1);break;}
                        if(cmds[i].subcmds.length>0)recur(cmds[i].subcmds,cmds[i].name);
                    }
                }
            }
        };
        addCmd(//---exit---------------------------------------------------------------------------
            {name:config.systemPrefix+'exit'
            ,about:'Exit the process: ['+config.systemPrefix+'exit] [code (optional int)]'
            ,func:(ext)=>{
                if(ext!==''){
                    let code='';
                    for(let i=0;i<ext.length;i++){if(numbers.indexOf(ext[i])>-1)code+=ext[i];else break;}
                    if(code==='')code='0';
                    config.process.exit(parseInt(code));
                }
                else config.process.exit();
        }});
        addCmd(//---exitOnError---------------------------------------------------------------------------
            {name:config.systemPrefix+'exitOnError'
            ,about:'Set option to exit on error: ['+config.systemPrefix+'exitOnError] [(bool)]'
            ,func:(ext)=>{
                ext=ext.toLowerCase();
                if(ext==='true'||ext==='yes'||ext==='y'||ext==='1')config.exitOnError=true;
                if(ext==='false'||ext==='no'||ext==='n'||ext==='0')config.exitOnError=false;
        }});
        addCmd(//---showCursor---------------------------------------------------------------------------
            {name:config.systemPrefix+'showCursor'
            ,about:'Display stdin text cursor: ['+config.systemPrefix+'showCursor] [(bool)]'
            ,func:(ext)=>{
                ext=ext.toLowerCase();
                if(ext==='true'||ext==='yes'||ext==='y'||ext==='1')config.showCursor=true;
                if(ext==='false'||ext==='no'||ext==='n'||ext==='0')config.showCursor=false;
        }});
        addCmd(//---nullHelpMsg---------------------------------------------------------------------------
            {name:config.systemPrefix+'nullHelpMsg'
            ,about:'Display stdin text cursor: ['+config.systemPrefix+'nullHelpMsg] [(bool)]'
            ,func:(ext)=>{
                ext=ext.toLowerCase();
                if(ext==='true'||ext==='yes'||ext==='y'||ext==='1')config.nullHelpMsg=true;
                if(ext==='false'||ext==='no'||ext==='n'||ext==='0')config.nullHelpMsg=false;
        }});
        addCmd(//---file---------------------------------------------------------------------------
            {name:config.systemPrefix+'file'
            ,about:'Set log file name: ['+config.systemPrefix+'file] [(string)]'
            ,func:(ext)=>{config.file=ext;}
        });
        addCmd(//---maxEntries---------------------------------------------------------------------------
            {name:config.systemPrefix+'maxEntries'
            ,about:'Set maximum stdin entries: ['+config.systemPrefix+'maxEntries] [(int)]'
            ,func:(ext)=>{
                let num='';
                ext=ext.trim();
                for(let i=0;i<ext.length;i++){if(numbers.indexOf(ext[i])>-1)num+=ext[i];else break;}
                if(num!==''){
                    let number=parseInt(num);
                    config.maxEntries=(number<0)?0:number;
                }
        }});
        addCmd(//---tag---------------------------------------------------------------------------
            {name:config.systemPrefix+'tag'
            ,about:'Set the stdin tag string & colouring: ['+config.systemPrefix+'tag] [sub cmds]'
        });
        addCmd(//---tag string---------------------------------------------------------------------------
            {name:config.systemPrefix+'tag string'
            ,about:'Set the stdin tag string: ['+config.systemPrefix+'tag] [string] [(string)]'
            ,func:(ext)=>{config.tag=ext;}
        });
        addCmd(//---tag color---------------------------------------------------------------------------
            {name:config.systemPrefix+'tag color'
            ,about:'Set the stdin tag font color integer: ['+config.systemPrefix+'tag] [color] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.tagClr=ext;}
        });
        addCmd(//---tag back---------------------------------------------------------------------------
            {name:config.systemPrefix+'tag back'
            ,about:'Set the stdin tag background color integer: ['+config.systemPrefix+'tag] [back] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.tagClrBack=ext;}
        });
        addCmd(//---text---------------------------------------------------------------------------
            {name:config.systemPrefix+'text'
            ,about:'Set the stdin text colouring: ['+config.systemPrefix+'text] [sub cmds]'
        });
        addCmd(//---text color---------------------------------------------------------------------------
            {name:config.systemPrefix+'text color'
            ,about:'Set the stdin text font color integer: ['+config.systemPrefix+'text] [color] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.textClr=ext;}
        });
        addCmd(//---text back---------------------------------------------------------------------------
            {name:config.systemPrefix+'text back'
            ,about:'Set the stdin text background color integer: ['+config.systemPrefix+'text] [back] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.textClrBack=ext;}
        });
        addCmd(//---cmds---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds'
            ,about:'Set the command call coloring & display: ['+config.systemPrefix+'cmds] [sub cmds]'
        });
        addCmd(//---cmds display---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds display'
            ,about:'Display command call & args: ['+config.systemPrefix+'cmds] [display] [(bool)]'
            ,func:(ext)=>{
                ext=ext.toLowerCase();
                if(ext==='true'||ext==='yes'||ext==='y'||ext==='1')config.displayCmdCall=true;
                if(ext==='false'||ext==='no'||ext==='n'||ext==='0')config.displayCmdCall=false;
        }});
        addCmd(//---cmds color---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds color'
            ,about:'Set the command call font color integer: ['+config.systemPrefix+'cmds] [color] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.cmdsClr=ext;}
        });
        addCmd(//---cmds back---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds back'
            ,about:'Set the command call background color integer: ['+config.systemPrefix+'cmds] [back] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.cmdsClrBack=ext;}
        });
        addCmd(//---cmds argcolor---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds argcolor'
            ,about:'Set the command call argument font color integer: ['+config.systemPrefix+'cmds] [argcolor] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.cmdsValueClr=ext;}
        });
        addCmd(//---cmds argback---------------------------------------------------------------------------
            {name:config.systemPrefix+'cmds argback'
            ,about:'Set the command call argument background color integer: ['+config.systemPrefix+'cmds] [argback] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.cmdsValueClrBack=ext;}
        });
        addCmd(//---flag---------------------------------------------------------------------------
            {name:config.systemPrefix+'flag'
            ,about:'Set the command flag strings: ['+config.systemPrefix+'flag] [sub cmds]'
        });
        addCmd(//---flag about---------------------------------------------------------------------------
            {name:config.systemPrefix+'flag about'
            ,about:'Set the about flag string: ['+config.systemPrefix+'flag] [about] [(string)]'
            ,func:(ext)=>{ext=ext.trim().replace(' ','');if(ext!=='')config.flagAbout=ext;}
        });
        addCmd(//---flag subcmds---------------------------------------------------------------------------
            {name:config.systemPrefix+'flag subcmds'
            ,about:'Set the subcmds flag string: ['+config.systemPrefix+'flag] [subcmds] [(string)]'
            ,func:(ext)=>{ext=ext.trim().replace(' ','');if(ext!=='')config.flagSubCmds=ext;}
        });
        addCmd(//---flag insert---------------------------------------------------------------------------
            {name:config.systemPrefix+'flag insert'
            ,about:'Set the insert flag string: ['+config.systemPrefix+'flag] [insert] [(string)]'
            ,func:(ext)=>{ext=ext.trim().replace(' ','');if(ext!=='')config.flagInsert=ext;}
        });
        addCmd(//---about---------------------------------------------------------------------------
            {name:config.systemPrefix+'about'
            ,about:'Set the about option colouring & string: ['+config.systemPrefix+'about] [sub cmds]'
        });
        addCmd(//---about color---------------------------------------------------------------------------
            {name:config.systemPrefix+'about color'
            ,about:'Set the about option font color integer: ['+config.systemPrefix+'about] [color] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.aboutTextClr=ext;}
        });
        addCmd(//---about back---------------------------------------------------------------------------
            {name:config.systemPrefix+'about back'
            ,about:'Set the about option background color integer: ['+config.systemPrefix+'about] [back] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.aboutTextClrBack=ext;}
        });
        addCmd(//---about bullet---------------------------------------------------------------------------
            {name:config.systemPrefix+'about bullet'
            ,about:'Set the about option bullet colouring & string: ['+config.systemPrefix+'about] [bullet] [sub cmds]'
        });
        addCmd(//---about bullet string---------------------------------------------------------------------------
            {name:config.systemPrefix+'about bullet string'
            ,about:'Set the about option bullet string: ['+config.systemPrefix+'about] [bullet] [string] [(string)]'
            ,func:(ext)=>{
                let temp='';
                for(let i=ext.length-1;i>=0;i--)if(ext[i]!==''||ext[i]!==' ')temp=ext[i]+temp;
                if(temp!=='')config.aboutBullet=ext;
            }
        });
        addCmd(//---about bullet color---------------------------------------------------------------------------
            {name:config.systemPrefix+'about bullet color'
            ,about:'Set the about option bullet font color integer: ['+config.systemPrefix+'about] [bullet] [color] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.aboutTextClr=ext;}
        });
        addCmd(//---about bullet back---------------------------------------------------------------------------
            {name:config.systemPrefix+'about bullet back'
            ,about:'Set the about option bullet background color integer: ['+config.systemPrefix+'about] [bullet] [back] [(int)]'
            ,func:(ext)=>{ext=ext.trim();config.aboutTextClrBack=ext;}
        });
        cmdsLock=cmds.length;
        //===========================================================================================================
        let keys=[],keysLock=0;
        let makeKey=(obj)=>{
            let ret={};for(let i in keyconf)ret[i]=keyconf[i];
            if(typeof(obj)==='object'){
                for(let i in keyconf)if(obj[i]!==undefined)ret[i]=obj[i];
                ret.name=ret.name.trim();
                if(typeof(ret.func)!=='function')ret.func=keyconf.func;
            }
            else if(typeof(obj)==='string')ret.name=obj.trim();
            return ret;
        };
        let getKey=(obj)=>{
            let key=undefined;
            if(typeof(obj)==='object')for(let i=0;i<keys.length;i++)if(keys[i].name===obj.name&&keys[i].ctrl===obj.ctrl&&keys[i].shift===obj.shift&&keys[i].meta===obj.meta){key=keys[i];break;}
            return key;
        };
        let key=(key,data)=>{
            if(typeof(key)==='string'&&data===undefined)data=makeKey(data);
            else if(typeof(key)==='object')data=makeKey(key);
            key=getKey(data);
            if(key!==undefined)key.func(data);
            else{
                lastCursor=0;
                last[lastCursor]+=(data.sequence!=='')?data.sequence:data.name;
                xCursor=last[0].length;
                updateDisplay(lastCursor,false);
            }
        };
        let addKey=(obj)=>{
                let key=makeKey(obj);
                if(getKey(key)===undefined)keys.push(key);
        };
        let delKey=(obj)=>{
            let key=makeKey(obj);
            for(let i=keysLock;i<keys.length;i++)if(keys[i].name===key.name&&keys[i].ctrl===key.ctrl&&keys[i].shift===key.shift&&keys[i].meta===key.meta){keys.splice(i,1);break;}
        };
        addKey({name:'c',ctrl:true,func:()=>{config.process.exit();}});
        addKey({name:'up',func:()=>{updateEntryCursor(1);}});
        addKey({name:'down',func:()=>{updateEntryCursor(-1);}});
        addKey({name:'right',func:()=>{updateDisplay(lastCursor,false,1);}});
        addKey({name:'left',func:()=>{updateDisplay(lastCursor,false,-1);}});
        addKey({name:'backspace',func:()=>{
            lastCursor=0;
            last[lastCursor]=last[lastCursor].substring(0,last[lastCursor].length-1);
            updateDisplay(lastCursor,false,-1);
        }});
        addKey({name:'return',func:()=>{
            lastCursor=0;
            xCursor=0;
            last.unshift('');
            if(last.length>config.maxEntries)last.length=config.maxEntries;
            updateDisplay(lastCursor,true);
            if(last[lastCursor+1]!=='')cmd(last[lastCursor+1]);
            else if(config.nullHelpMsg===true){
                let msg='\n   '+clrF(11)+'»'+clrF(7)+' Press '+clrF(5)+'Up '+clrF(7)+'or '+clrF(5)+'Down '+clrF(7)+'to scroll the current stdin entries\n   '+
                clrF(11)+'?'+clrF(7)+' Entries are previous inputs or commands inserted with \''+clrF(6)+config.flagInsert+clrF(7)+'\'\n   '+
                clrF(11)+'»'+clrF(7)+' Type \''+clrF(6)+config.systemPrefix+' -a'+clrF(7)+'\' & return to see a list of gui cmd trees with info\n   '+
                clrF(11)+'»'+clrF(7)+' Type \''+clrF(6)+' -a'+clrF(7)+'\' & return to see a list of user cmd trees with info\n   '+
                clrF(11)+'+'+clrF(7)+' With \''+clrF(6)+config.flagSubCmds+clrF(7)+'\' '+'to include sub-commands\n';
                config.stdout.write(msg+'\x1b[0m\n');
            }
        }});
        keysLock=keys.length;
        //===========================================================================================================
        let lastCursor=0,last=[''],display='',xCursor=0;
        let updateDisplay=(cursor=lastCursor,logBefore=false,adj=0)=>{
            let msg=(logBefore===false)?'':clrF(config.tagClr)+clrB(config.tagClrBack)+config.tag+clrF(config.textClr)+clrB(config.textClrBack)+last[1]+'\n';
            let cnt=config.stdout.columns-config.tag.length;
            if(adj>0)xCursor++;
            if(adj<0)xCursor--;
            if(last[cursor].length-xCursor<cnt)xCursor=last[cursor].length-cnt;
            if(xCursor<0)xCursor=0;
            display=clrF(config.tagClr)+clrB(config.tagClrBack)+config.tag+clrF(config.textClr)+clrB(config.textClrBack)
                   +last[cursor].substr(xCursor,cnt)
                   +((config.showCursor===false)?'\x1B[?25l\x1b[0m':'\x1B[?25h\x1b[0m');
            config.stdout.write(msg);
        };
        let updateEntryCursor=(int)=>{
            lastCursor+=Math.floor(int);
            last[0]='';
            if(lastCursor<0)lastCursor=0;
            if(lastCursor>last.length-1)lastCursor=last.length-1;
            last[0]=last[lastCursor];
            xCursor=last[0].length;
            updateDisplay(lastCursor);
        };
        //===========================================================================================================
        config.flagAbout=config.flagAbout.trim();
        if(config.flagAbout===''||typeof(config.flagAbout)!=='string')config.flagAbout='-a';
        config.flagSubCmds=config.flagSubCmds.trim();
        if(config.flagSubCmds===''||typeof(config.flagSubCmds)!=='string')config.flagSubCmds='-s';
        config.flagInsert=config.flagInsert.trim();
        if(config.flagInsert===''||typeof(config.flagInsert)!=='string')config.flagInsert='-i';
        if(config.aboutBullet===''||typeof(config.aboutBullet)!=='string')config.aboutBullet=' └ ';
        if(typeof(config.tag)!=='string')config.tag='fstdin> ';
        config.systemPrefix=config.systemPrefix.trim();
        if(config.systemPrefix===''||typeof(config.systemPrefix)!=='string')config.systemPrefix='.'
        //===========================================================================================================
        config.stdout.write=((write)=>{
            config.stdout.fstdinwrite=write;
            return function(chunk,encoding,cb){
                if(typeof(config.file)==='string'&&config.file!=='')
                    appendFile(config.file,chunk.replace(/\x1B[@-Z\\-_]|[\x80-\x9A\x9C-\x9F]|(?:\x1B\[|\x9B)[0-?]*[ -/]*[@-~]/g,'')
                            ,{encoding:encoding},(err)=>{if(err!=null)config.process.emit('uncaughtException',err);});
                write.apply(this,[`\x1B[2K\x1b[${config.stdout.columns}D`+chunk+display,encoding,cb]);
            };
        })(config.stdout.fstdinwrite||config.stdout.write);
        config.process.exit=((func)=>{
            if(func){
                config.process.fstdinexit=func;
                config.process.removeListener(`SIGINT`,func);
                config.process.removeListener(`SIGTERM`,func);
                config.process.removeListener(`SIGUSR1`,func);
                config.process.removeListener(`SIGUSR2`,func);
            }
            func=((ret)=>{
                return function(code=config.process.exitCode){
                    config.process.exitCode=code;
                    if(typeof(config.onExit)!=='function')config.onExit(code);
                    config.stdout.fstdinwrite(`\x1B[2K\x1b[${config.stdout.columns}D\x1b[0m`);
                    ret(...arguments);
                }
            })(func);
            config.process.on(`SIGINT`,func);
            config.process.on(`SIGTERM`,func);
            config.process.on(`SIGUSR1`,func);
            config.process.on(`SIGUSR2`,func);
            return func;
        })(config.process.fstdinexit||config.process.exit);
        config.process.fstdinUncaughtException=((func)=>{
            if(func)config.process.removeListener('uncaughtException',func);
            let ret=(err)=>{
                config.stdout.write(formatWithOptions({colors:true,customInspect:false,compact:false,breakLength:config.stdout.columns-1},err)+'\n');
                if(!!config.exitOnError)config.process.exit(1);
            };
            config.process.on(`uncaughtException`,ret);
            return ret;
        })(config.process.fstdinUncaughtException);
        config.stdin.key=((func)=>{
            if(func)config.stdin.removeListener('keypress',func);
            emitKeypressEvents(config.stdin);
            if(config.stdin.isTTY)config.stdin.setRawMode(true);
            func=key;
            config.stdin.on('keypress',func);
            return func;
        })(config.stdin.key);
        //===========================================================================================================
        updateDisplay(0);
        return{
             command:function(string=''){for(let i=0;i<arguments.length;i++)cmd(arguments[i]);}
            ,addCommand:function(obj=cmdconf){for(let i=0;i<arguments.length;i++)addCmd(arguments[i]);}
            ,delCommand:function(name=''){for(let i=0;i<arguments.length;i++)delCmd(arguments[i]);}
            ,key:function(obj=keyconf){for(let i=0;i<arguments.length;i++)key(arguments[i]);}
            ,addKey:function(obj=keyconf){for(let i=0;i<arguments.length;i++)addKey(arguments[i]);}
            ,delKey:function(obj=keyconf){for(let i=0;i<arguments.length;i++)delKey(arguments[i]);}
       };
    }
};
//===========================================================================================================sdg
module.exports=(config=stdconf)=>stdin(config);