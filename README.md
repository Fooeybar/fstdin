# **fstdin**

![npm](https://img.shields.io/npm/v/fstdin?style=flat-square)
![node](https://img.shields.io/node/v/cau?style=flat-square)

</br>

Easily add input commands and key bindings to a terminal-based Node project

</br>

`npm i fstdin`</br>

</br>

---

## Initialization

</br>

`let fstdin=require('fstdin')({config});`</br>

All config property primitives/strings can be modified from the command line at runtime.</br>

Any config properties `undefined` will default to the values listed below:</br>

- `.process: process`
- `.stdout: process.stdout`
- `.stdin: process.stdin`
- `.tag: 'fstdin> '`
- `.tagClr: 2`
- `.tagClrBack: -1`
- `.textClr: 7`
- `.textClrBack: -1`
- `.flagSubCmds: '-s'`
- `.flagInsert: '-i'`
- `.flagAbout: '-a'`
- `.aboutBullet: ' └ '`
- `.aboutBulletClr: 11`
- `.aboutBulletClrBack: -1`
- `.aboutTextClr: 7`
- `.aboutTextClrBack: -1`
- `.displayCmdCall: true`
- `.cmdsClr: 4`
- `.cmdsClrBack: -1`
- `.cmdsValueClr: 11`
- `.cmdsValueClrBack: -1`
- `.systemPrefix: '.'`
- `.maxEntries: 100`
- `.showCursor: true`
- `.exitOnError: false`
- `.onExit: function (code){}`
- `.file: ''`
- `.nullHelpMsg: true`

</br>

Returns an object with the following properties:</br>

- `.command: function (str,...){}`
- `.addCommand: function (obj,...){}`
- `.delCommand: function (str,...){}`
- `.key: function (obj||str,...){}`
- `.addKey: function (obj,...){}`
- `.delKey: function (obj,...){}`

</br>

---

## Key Bindings

</br>

Key bindings are added, deleted, and triggered by matching all key binding property values</br>

Adding key bindings with `fstdin.addKey(object,...)`:</br>
- The prototype object argument:
    - `name: ''`
    - `ctrl: false `
    - `meta: false `
    - `shift: false `
    - `func: function(){} `
- At minimum, a name is required to add a key binding, however this will bind a no-op function

</br>

Triggering keys with `fstdin.key(object||string,...)` is the equivalent of pressing the key(s) at runtime in the terminal

</br>

---

## Commands

</br>

Command trees are similar to a directory tree, using whitespace `' '` as the path separator</br>

**Adding commands with** `fstdin.addCommand(object,...)`**:**</br>
- The prototype object argument:
    - `name: '' `
    - `about: '' `
    - `func: function(string){} `
- At minimum, a name is required to create a command tree or add a branch
- Commands are created recursively
- If an `.about` description is included, it will be applied to the last command in the recursive chain
- To add sub-commands to an existing command, the sub-command name must include the full command path
- The command function argument will always be a string type

</br>

Calling commands with `fstdin.command(string,...)` is the equivalent of entering the command(s) at runtime in the terminal

</br>

**At runtime:** </br>

During runtime, the fstdin input acts as a command **call** or **search**:
- To **call** a command, input the command path exactly followed by any arguments
- To **search** commands, input:
    - whitespace `' '` to search all commands
    - a portion of a command path
    - or a command tree with any flag included
    - optional flags
        - about: `-a`: returns a description of the command
        - subcmds: `-s`: includes sub-commands in the command search/call
        - insert: `-i`: insert command search results into fstdin entry list

- A command with sub-commands can only be called with an empty string argument `''`

</br>

**Example:** 
- The command tree for changing the text input colors is: `.text`
- To **read** the 'about' info for this command, input:`.text -a`
- To also include the 'about' info of the sub-commands, input:`.text -a -s`
- To also insert the searched results into the fstdin entry list, input:`.text -a -s -i`
    - The commands can now be scrolled using the `up`/`down` arrow keys and returned as input
- To **call** the `.text`, input:`.text`
    - Since this command has sub-commands, it can only be called with an empty string argument `''`
    - Additionally this command has no function to call and is used as a directory
- The sub-command for setting the text color is: `.text color`
- To **call** the color sub-command, input:`.text color 4`
    - The color sub-command takes an integer as input
    - Has no sub-commands and will always be **called** if the 'about' or 'insert' flag is not included

</br>