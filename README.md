# **fstdin**

![npm](https://img.shields.io/npm/v/fstdin?style=flat-square)
![node](https://img.shields.io/node/v/cu?style=flat-square)
![license](https://img.shields.io/badge/License-MIT-blue.svg)
Made with ![linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)

</br>

Simple terminal interface + prompts

</br>

- [Initialization](#initialization)
- [Prompts](#prompts)
- [Root Prompt](#root-prompt)
- [Masking](#masking)
- [Colouring](#coloring)
- [Keys](#keys)
- [Shortcut Keys](#shortcut-keys)

</br>

---

## Initialization

</br>

`fstdin=require('fstdin')({config});`</br>

</br>

Any config properties `undefined` or `typeof!==` will default to the values listed below:</br>

```
config={
    text_color : 15
   ,cursor_color : 15
   ,input_history : 50
   ,escape : '\x1b'
   ,mask_char : '*'
   ,on_exit : function(code=0){}
   ,on_line : function(line=''){}
   ,on_key : function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false}){}
}
```

</br>

Returns an object with the properties:</br>

```
fstdin()={
    line : ''                           //Read-only current stdin
    ,key : function(string||object,...) //Trigger keys
    ,prompt : function(object,...)      //Prompt user
}
```

</br>

Change the config by calling the fstdin function with new config settings.

</br>

---

## Prompts

</br>

Prompts are entered as an object:</br>

```
prompt({
    line : 'What is your name?'
    ,any_key : true
})
```

The prompt function will take multiple prompts as arguments:</br>

```
prompt(
    {line : 'Hiya!', any_key : true}
    ,{line : 'Hello!', any_key : true}
    ,{line : 'Hi!', any_key : true}
    ,{line : 'Howdy!', any_key : true}
)
```

</br>

Prompt lines longer than the terminal columns will be split with `'\n'`.</br>

Prompt response input longer than the terminal columns will scroll to the right.</br>

Press `escape` to skip a prompt. The `prompt.func(res,esc)` will still be called, with `res=''` and `esc=true`.

</br>

Any prompt properties `undefined` or `typeof!==` will default to the values listed below:</br>

```
prompt={
    line : ''
    ,any_key : false
    ,color : 15
    ,root : false
    ,mask : false
    ,func : (response='',escape=false)=>{}
}
```

</br>

### Root Prompt

Include the property `root:true` to set a prompt as the root prompt. The root prompt will repeatedly occur when no other prompts are active.</br>

An example as a working directory prompt:</br>

```
.prompt(proot={
     line:process.cwd()+'~ '
    ,root:true
    ,func:(res)=>{
        console.log(process.cwd()+'~ '+res);
        proot.line=process.cwd()+'~ ';
    }
});
```

</br>

### Masking

Include the property `mask:true` to mask the input for that prompt.</br>

During a masked prompt, only the `config.mask_char` will be:</br>

- displayed in the terminal
- sent in `on_line(res)`
- recorded in input history
- recorded in the read-only line `{ line } = fstdin()`

Additionally, the following shortcuts are disabled and function not called:

- Undo `ctrl+z`
- Redo `ctrl+y`
- scroll input history `up`
- scroll input history `down`
- `config.on_key(key)`

Unmasked input can only be read in the `prompt.func(res,esc)` call:</br>

```
.prompt({
    line: 'Are you a Led Zeppelin fan?'
    ,mask: true
    ,func: (res,esc)=>{
        if(esc)console.log('Why no answer?'); //res.length==0
        else console.log(`So your answer is: ${res}`);
    }
});
```

</br>

### Coloring

Add color to your prompt line using the `.color` property:</br>
- `prompt({line:'This line is yellow!',color:11})`</br>

</br>

---

## Keys

</br>

Keys are either an object `{name:'c',ctrl:true} //ctrl+c (end process)`</br>
Or may also be entered as strings when using `.key(key,...)`</br>

Triggering keys with `.key(key,..)` is the equivalent of pressing the key(s) at runtime, however, this will not trigger the `.on_key(key)` function.</br>

The `on_key(key)` will send an object when a key is physically pressed:</br>

```
key={
    name: ''
    ,sequence : ''
    ,ctrl : false
    ,meta : false
    ,shift : false
}
```

</br>

### Shortcut Keys

</br>

- Exit the process using `ctrl+c {name:'c',ctrl:true}`
- Scroll the previous stdin history using `'up'` or `'down'` arrow keys
- Undo `ctrl+z {name:'z',ctrl:true}`
- Redo `ctrl+y {name:'y',ctrl:true}`
- Escape `'escape'` skip a prompt or return to current history

</br>

---
