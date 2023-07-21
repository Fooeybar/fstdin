function colour_fore(int=0,escape=std_config.escape){
    let ret=escape;
    if(0<=int&&int<256)ret+=`[38;5;${int}m`;
    else ret+='[0m';
    return ret;
};

function colour_back(int=0,escape=std_config.escape){
    let ret=escape;
    if(0<=int&&int<256)ret+=`[48;5;${int}m`;
    else ret+='[0m';
    return ret;
};

const std_config={
    text_color:15
   ,cursor_color:15
   ,input_history:50
   ,escape:'\x1b'
   ,mask_char:'*'
   ,title:'fstdin'
   ,on_exit:function(code=0){}
   ,on_line:function(line=''){}
   ,on_key:function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false}){}
};

const std_prompt={
    line:''
    ,any_key:false
    ,color:std_config.text_color
    ,root:false
    ,mask:false
    ,func:(response='',escape=false)=>{}
};

const std_key={
    name:''
    ,sequence:''
    ,ctrl:false
    ,meta:false
    ,shift:false
};

const _return={
    line:''
    ,key:function key(key=std_key){
        for(let i=0;i<arguments.length;i++)
            key_me_config(arguments[i]);
    }
    ,prompt:function prompt(query=std_prompt){
        return prompt_me_config(arguments);
    }
    ,colour_fore
    ,colour_back
};

let init=true;
let history_arr=[''];
let history_pos=0;
let prompts_arr=[];
let prompt_pos=-1;
let std_in={line:'',undo:[''],undo_pos:0};
let prompt={line:'',undo:[''],undo_pos:0};
let current=std_in;
let root_prompt=undefined;
let display='';
let clear='';
let mask_hold='';

//key_press wrapper for resetting config
let key_press_func=()=>{};

//key_me wrapper for resetting config
let key_me_config=(key)=>key_me(key,undefined,std_config);

//prompt_me wrapper for resetting config
let prompt_me_config=(prompts)=>prompt_me(prompts,std_config);

function check_config(config){
    if(config!==std_config){
        for(let i in std_config){
            if(config[i]===undefined
            ||typeof(config[i])!==typeof(std_config[i]))
                config[i]=std_config[i];
        }
        display=colour_back(config.cursor_color,config.escape)+' '+colour_fore(-1,config.escape);
        clear=config.escape+'[2K';
    }
};

function set_clear(escape,count){
    //set line count to clear
    clear=escape+'[2K';
    while(1<count--)clear+=escape+'[1A'+escape+'[2K';
};

function set_undo(){
    //log keystroke for undo list
    if((history_pos<history_arr.length-1
        &&current.line!==history_arr[history_pos])
    ||current.line!==current.undo[current.undo_pos]){
        current.undo_pos++;
        current.undo[current.undo_pos]=current.line;            
    }
};

function scroll_history(count,config){
    //scroll 'entered' input history_arr
    history_pos+=count;
    if(history_pos<0)history_pos=0;
    else if(history_arr.length-1<history_pos)history_pos=history_arr.length-1;
    current.line=history_arr[history_pos];
    set_undo();
    render(false,config);
};

function set_redo(count,config){
    //redo previous from undo list
    current.undo_pos+=count;
    if(current.undo_pos>current.undo.length-1)current.undo_pos=current.undo.length-1;
    else if(current.undo_pos<0)current.undo_pos=0;
    current.line=current.undo[current.undo_pos];
    history_pos=history_arr.length-1;
    render(false,config);
};

function pop_prompt(escape=false,config){
    //temp store prompt response
    let line='';

    //if using mask and mask_hold has data, store data (unmasked) and reset mask_hold
    if(is_mask_enabled()){
        if(!escape)line=mask_hold;
        mask_hold='';
    }
    else line=prompt.line;

    //clear working prompt data
    prompt={line:'',undo:[''],undo_pos:0};

    //call prompt response func
    prompts_arr[prompt_pos].func(line,escape);

    //end of prompts_arr
    if(++prompt_pos===prompts_arr.length){
        //discard prompts_arr data
        prompts_arr.length=0;
        //root prompt exists? push to prompts_arr[0]
        if(root_prompt!==undefined){
            prompts_arr[prompts_arr.length++]=root_prompt;
            //set iterator to first position
            prompt_pos=0;
        }
        //set iterator to none
        else prompt_pos=-1;
    }

    //render changes
    render(false,config);
};

function check_prompt_props(prompt){
    let out=false;

    if(typeof(prompt)==='object'){
        out=true;
        if(prompt!==std_prompt){

            for(let i in std_prompt){
                if(prompt[i]===undefined
                ||typeof(prompt[i])!==typeof(std_prompt[i]))
                    prompt[i]=std_prompt[i];
            }

            //for newline marking
            prompt.new=1;
            prompt.newpos=[];
        }
    }

    return out;
};

function prompt_me(prompts=[],config){
    //intake and display prompts
    for(let i=0;i<prompts.length;i++){
        if(check_prompt_props(prompts[i])){

            //count & record position of explicit newlines
            for(let j=prompts[i].line.length-1;j>=0;j--){
                if(prompts[i].line[j]==='\n'){
                    prompts[i].new++;
                    prompts[i].newpos[prompts[i].newpos.length++]=j;
                }
            }

            //if is root, store in root object
            if(prompts[i].root===true)root_prompt=prompts[i];

            //store prompts
            prompts_arr[prompts_arr.length++]=prompts[i];
        }
    }

    //if 1+ prompts stored
    if(prompts_arr.length>0){

        //go to first
        if(prompt_pos===-1)prompt_pos=0;

        //or clear for next prompt to display
        else if(prompts_arr[prompt_pos]===root_prompt)prompt={line:'',undo:[''],undo_pos:0};

        //render prompts
        render(false,config);
    }
};

function render(before=false,config){
    //line formatting for terminal view
    let extclear=0;
    let extcolumns=0;
    display='';

    //prompt: known newlines & overflow newlines formatting
    if(-1<prompt_pos){
        current=prompt;
        let pline=prompts_arr[prompt_pos].line;

        //known newlines extended clear line counter
        if(prompts_arr[prompt_pos].new>1){
            for(let i=prompts_arr[prompt_pos].newpos.length-1,oldpos=i;i>=0;i--){
                let temprompt_pos=prompts_arr[prompt_pos].newpos[i]-oldpos;
                let num=Math.floor((temprompt_pos)/(process.stdout.columns-1));
                extclear+=num;
                oldpos=prompts_arr[prompt_pos].newpos[i];
            }
            if(process.stdout.columns-1<=pline.length-prompts_arr[prompt_pos].newpos[0]+current.line.length){
                extcolumns=pline.length-prompts_arr[prompt_pos].newpos[0];
            }
        }
        
        //is prompt line longer than terminal columns?
        else if(process.stdout.columns-1<=prompts_arr[prompt_pos].line.length){
            let last=0;
            pline='';

            //extended clear line counter and overflow newline insertion
            for(let i=0,mark=0;i<prompts_arr[prompt_pos].line.length;i++){
                if(i-mark===process.stdout.columns-1){
                    pline+='\n';
                    extclear++;
                    mark=i;
                    last=0;
                }
                pline+=prompts_arr[prompt_pos].line[i];
                last++;
            }

            if(process.stdout.columns-1<=last+current.line.length)extcolumns=last;
        }

        else if(process.stdout.columns-1<=pline.length+current.line.length){
            extcolumns=pline.length;
        }
        //set display line to be written
        display=colour_fore(prompts_arr[prompt_pos].color,config.escape)+pline;
    }
    //no prompts
    else current=std_in;

    //add to display line to be written
    display+=colour_fore(config.text_color,config.escape)
            +((process.stdout.columns-extcolumns-1>current.line.length)?
                current.line
                :current.line.substring(
                    current.line.length
                    -process.stdout.columns
                    +extcolumns+1
                )
            )
            +colour_back(config.cursor_color,config.escape)
            +' '
            +colour_fore(-1,config.escape);

    //set current line in history_arr
    if(current.line.length>0
    &&history_pos===history_arr.length-1)
        history_arr[history_arr.length-1]=current.line;

    //write previous input line, 'enter' pressed 
    if(before===true){
        process.stdout.write(
            colour_fore(config.text_color,config.escape)
            +history_arr[history_arr.length-2]
            +'\n'
            ,(err)=>{
                if(err)console.error(err);
                else{
                    //send input line to user
                    config.on_line(history_arr[history_arr.length-2]);
                    //set lines to clear for next prompt
                    set_clear(
                        config.escape
                        ,(-1<prompt_pos)?
                            prompts_arr[prompt_pos].new+extclear
                            :1
                    );
                }
            }
        );
    }

    //write current input line, input not sent to user
    else process.stdout.write(
        ''
        ,(err)=>{
            if(err)console.error(err);
            //set lines to clear for next prompt
            else set_clear(
                config.escape
                ,(-1<prompt_pos)?
                    prompts_arr[prompt_pos].new+extclear
                    :1
            );
        }
    );
};

function is_mask_enabled(){
    return (prompt_pos>-1&&prompts_arr[prompt_pos].mask);
};

function key_me(ch,key,config){
    //check key for correct type
    if(key===undefined){
        if(typeof(ch)==='string')key={name:''+ch,sequence:''+ch,ctrl:false,meta:false,shift:false};
        else if(typeof(ch)==='object'){
            key=ch;
            if(key.ctrl===undefined)key.ctrl=false;
            if(key.meta===undefined)key.meta=false;
            if(key.shift===undefined)key.shift=false;
        }
        ch=undefined;
    }
    
    if/*ctrl+c*/(key.name==='c'&&key.ctrl===true&&key.meta===false&&key.shift===false)process.exit();

    else if(prompt_pos>-1&&prompts_arr[prompt_pos].any_key===true)pop_prompt(false,config);

    else/*up*/if(key.name==='up'&&key.ctrl===false&&key.meta===false&&key.shift===false){
        if(!is_mask_enabled())scroll_history(-1,config);
    }

    else/*down*/if(key.name==='down'&&key.ctrl===false&&key.meta===false&&key.shift===false){
        if(!is_mask_enabled())scroll_history(1,config);
    }

    else/*ctrl+z*/if(key.name==='z'&&key.ctrl===true&&key.meta===false&&key.shift===false){
        if(!is_mask_enabled())set_redo(-1,config);
    }

    else/*ctrl+y*/if(key.name==='y'&&key.ctrl===true&&key.meta===false&&key.shift===false){
        if(!is_mask_enabled())set_redo(1,config);
    }

    else/*escape*/if(key.name==='escape'&&key.ctrl===false&&key.shift===false){
        if(prompts_arr.length>0)pop_prompt(true,config);
        else{
            current.line=current.undo[current.undo_pos];
            history_pos=history_arr.length-1;
            render(false,config);
        }
    }

    else/*backspace*/if(key.name==='backspace'&&key.ctrl===false&&key.meta===false&&key.shift===false){
        if(prompts_arr.length===0&&history_pos<history_arr.length-1){
            current.line=history_arr[history_pos];
            history_pos=history_arr.length-1;
        }
        if(current.line.length>0){
            current.line=current.line.substring(0,current.line.length-1);
            if(is_mask_enabled())mask_hold=mask_hold.substring(0,mask_hold.length-1);
            else set_undo();
            render(false,config);
        }
    }

    else/*return*/if((key.name==='return'||key.name==='enter')&&key.ctrl===false&&key.meta===false&&key.shift===false){
        history_pos=history_arr.length-1;
        if(current.line.length>0&&history_arr[history_arr.length-2]!==current.line){
            history_arr[history_pos++]=current.line;
            history_arr[history_pos]='';
            if(history_arr.length>config.input_history+1)history_arr.splice(0,history_arr.length-config.input_history-1);
        }
        if(prompt_pos>-1)pop_prompt(false,config);
        else if(current.line.length>0){
                current.line='';
                current.undo_pos=0;
                current.undo=[''];
                render(true,config);
            }
        else config.on_line('');
    }

    else if(key.sequence.length===1){
        if(is_mask_enabled()){
            current.line+=config.mask_char;
            mask_hold+=key.sequence;
        }
        else {
            current.line+=key.sequence;
            set_undo();
        }
        render(false,config);
    }

    //set read-only line for user
    _return.line=current.line;

    //key is not from user, send key to user
    if(ch!==undefined){
        //if mask disabled send key
        if(!is_mask_enabled())config.on_key(key);
    }
};

function set_key_func(config){
    //set key press func with config
    process.stdin.setRawMode(true);
    require('readline').emitKeypressEvents(process.stdin);
    process.stdin.removeListener('keypress',key_press_func);
    key_press_func=(ch,key)=>key_me(ch,key,config);
    process.stdin.on('keypress',key_press_func);
};

function set_exit(config){
    //set exit func with config
    if(process.fexit===undefined)process.fexit=process.exit;
    process.exit=function(code){
        config.on_exit(code);
        process.stdout.fwrite(
            clear
            +config.escape
            +`[${process.stdout.columns}D${colour_fore(-1,config.escape)}${config.escape}[?25h`
            ,null
            ,()=>process.fexit(code)
        );
    };
};

function set_write(config){
    //set write func with config
    if(process.stdout.fwrite===undefined)process.stdout.fwrite=process.stdout.write;

    process.stdout.write=function(chunk,encoding,cb){
        process.stdout.fwrite(
            clear
            +config.escape
            +`[${process.stdout.columns}D`+chunk+display+colour_fore(-1,config.escape)
            ,encoding
            ,cb
        );
    };
};

function set_title(config){
    //set terminal title and clear line, first render
    if(init)process.stdout.write(config.escape+'[?25l'+config.escape+'[30m\033]0;'+config.title+'\007');
    else render(false,config);
};

function set_key_config(config){
    key_me_config=(key)=>key_me(key,undefined,config);
};

function set_prompt_config(config){
    prompt_me_config=(prompts)=>prompt_me(prompts,config);
};

module.exports=function fstdin(config=std_config){
    check_config(config);

    set_title(config);

    set_write(config);

    set_exit(config);
    
    set_key_func(config);

    set_key_config(config);

    set_prompt_config(config);

    init=false;

    return _return;
};