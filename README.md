# **fstdin**

![npm](https://img.shields.io/npm/v/fstdin?style=flat-square)
![node](https://img.shields.io/node/v/cu?style=flat-square)
![license](https://img.shields.io/badge/License-MIT-blue.svg)
Made with ![linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)

</br>

Simple stdin line control + prompts

</br>

---

## Initialization

</br>


`fstdin=require('fstdin')({config});`</br>

</br>

Any config properties `undefined` or `typeof!==` will default to the values listed below:</br>

- `.process: process`
- `.textClr: 15`
- `.curClr: 8`
- `.history: 100`
- `.escape: '\x1b'`
- `.onExit: function(code=0)`
- `.onLine: function(line='')`
- `.onKey: function(key={sequence:'',name:'',ctrl:false,meta:false,shift:false})`

</br>

Returns the config object with the added properties:</br>

- `.line: '' //Read-only current stdin`
- `.key: function(str||obj,...) //Trigger keys`
- `.prompt: function(obj,...) //Prompt user`
- `.font: function(int) //Returns color code string`
- `.back: function(int) //Returns color code string`

</br>

---

## Prompts

</br>

Prompts are entered as an object:
- `prompt({line:'Press any key to continue...'},{line:'Hiya!'})`</br>
- `prompt({line:'What is your name?',func:(res)=>{}})`</br>

Without a `.func()` property, the prompt will be passable using any key.</br>

Press `escape` to skip a prompt.</br>

Add color to your prompt line using `font()` & `back()`</br>
- `line=font(2)+back(3)+'This is my prompt line'`

</br>

---

## Keys

</br>

Keys are either an object `{name:'c',ctrl:true} //ctrl+c (end process)`</br>
Or may also be entered as strings when using `.key(key,...)`</br>

Triggering keys with `.key(key,..)` is the equivalent of pressing the key(s) at runtime in the terminal, however, this will not trigger the `.onKey(key)` function.

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