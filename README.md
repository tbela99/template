Template
============

Template is a context aware template engine with conditional replacement & iteration.

How to use
---------------------

Substitution is driven by tags that defined which action will be taken and whether the context should be switched. there are some predefined tags:

## Example 1 {#Tag:example-1}

	var template = 'Hi, my name is {name}';

	new Template().substitute(template, {name: 'Bob'}) // -> Hi, my name is Bob

## Example 2 {#Tag:example-2}

	var template = 'Hi, my name is {name}{if:age}, I am {age}{/if:age}';

	new Template().substitute(template, {name: 'Bob'}) // -> Hi, my name is Bob
	new Template().substitute(template, {name: 'Bob', age: function () { return 11 }}) // -> Hi, my name is Bob, I am 11

## Example 3 {#Tag:example-3}

	var template = 'Hi, my name is {name}.{if:kids} I have {length} lovely kids: <ul>{loop:}<li>{.}</li>{/loop:}</ul>{/if:kids}';

	new Template().substitute(template, {name: 'Martina'}) // -> Hi, my name is Martina.
	new Template().substitute(template, {name: 'Emily', kids: ['Brian', 'Edith', 'Spider man']}) // -> Hi, my name is Emily. I have 3 lovely kids: <ul><li>Brian</li><li>Edith</li><li>Spider man</li></ul>

## Example 4 {#Tag:example-4}

	var template = '<div><h1>{country}</h1>{defined:players}<ul>{repeat:players}<li>Player #{number}: {name}, {position}{not-empty:substitute}. substitute{/not-empty:substitute}</li>{/repeat:players}{/defined:players}</div>',
		data = [
				{
					country: 'Cameroon', 
					players: [
					
						{position: 'goalkeeper', number: 1, name: 'The Wall'},
						{position: 'attacker', number: 9, name: 'Speedy'}, 
						{position: 'middfield', number: 25, name: 'Charly', substitute: true}
					]
				}, 
				{
					country: 'Argentina', 
					players: [
					
						{position: 'middfield', number: 10, name: 'Diego'}, 
						{position: 'attacker', number: 8, name: 'Samuel', substitute: true}, 
						{position: 'goolkeeper', number: 1, name: 'Stone'}
					]
				}
			];

	new Template().substitute('{loop:}' + template + '{/loop:}', data) // -> <div><h1>Cameroon</h1><ul><li>Player #1: The Wall, goalkeeper</li><li>Player #9: Speedy, attacker</li><li>Player #25: Charly, middfield. substitute</li></ul></div><div><h1>Argentina</h1><ul><li>Player #10: Diego, middfield</li><li>Player #8: Samuel, attacker. substitute</li><li>Player #1: Stone, goolkeeper</li></ul></div>

## Template Tag: IF  {#Tag:if}

this tag switch the replacement context in the match1 if the property is evaluated to an object/array.

### Syntax:

 {if:property} match1 [{else:property} match2]{/if:property}

### Rules

- if the property does not exists or is evaluated to a falsy value (undefined, null, an empty string, an empty array or zero) the match2 is used in the current context if defined.
- if the property exists in the currrent context then match1 is used. if the property is evaluated to an object/array, the result is substituted in match1, else match1 will be used in the current context.


## Template Tag: DEFINED {#Tag:defined}

this tag does not switch the context.

### Syntax:

	{defined:property} match1 [{else:property} match2]{/defined:property}

### Rules

- if the property exists and is not undefined or null then match1 is used in the current context, else match2 is used in the current context

Syntax: {if:property} match1 [{else:property} match2]{/if:property}

## Template Tag: NOT-EMPTY {#Tag:not-empty}

this tag does not switch the context.

### Syntax: 

	{not-empty:property} match1 [{else:property} match2]{/not-empty:property}

### Rules

- if the property exists and is evaluated to a not a falsy value then match1 is used in the current context, else match2 is used in the current context

## Template Tag: EMPTY {#Tag:empty}

this tag does not switch the context.

### Syntax: 

	{empty:property} match1 [{else:property} match2]{/empty:property}

### Rules

- if the property does not exists or is evaluated to a falsy value then match1 is used in the current context, else match2 is used in the current context

## Template Tag: REPEAT {#Tag:repeat}

this tag switch the context

### Syntax: 
	
	{repeat:property} match1{/repeat:property}

### Rules

- if the property is evaluated to a an array/object then every elements will be susbstituted to match1. if the result of the evaluation is an object and that object contains a property 'each' which is a function, this property will be used to iterate over the object properties. if match1 contains '{.}' then '{.}' will be replaced by the current property value.

## Template Tag: LOOP {#Tag:loop}

this tag switch the context. this tag works exactly like the *repeat* tag, but iteration is done over the current context.

Syntax: {loop:} match1{/loop:}

# Template Class {#template:constructor}

### Syntax:

	var template = new Template([options]);
	
### Arguments:

- options - (*object*, optional)

#### Options:

* begin - (*string*, optional) opening token delimiter, default to *{*.
* end - (*string*, optional) closing token delimiter, default to *}*.
* multiline - (*boolean*, optional) this must be set to true if the template string contains the line feed character *(\n)*. default to *false*.
* placeholder - (*string*, optional) character used as a temporary replacement for the line feed. default to *\u21b5*. this parameter is ignored if multiline is set to false.
* debug - (*boolean*, optional) log messages in the console if there are token with no match.
* parse - (*function*, optional) function called when an unknown tag is found. you can use this to handle your custom tag

##### Options:parse Arguments

- tag - (*string*) tag name
- matches - (*array*) matches
- name - (*string*) property name
- data - (*mixed*) current context
- string - (*string*) current context string
- regExp - (*regexp*) 
- replace - (*regexp*)
- simplereg - (*regexp*)
- options - (*options*) this instance options


Template Method: substitute 
--------------------

substitute the given object into the given string template.

### Syntax:

	var template = new Template();
	
	var output = template.substitute(string, data[, options]);

### Returns:

* (*string*)

### Arguments:

- string - (*string*) input template
- data - (*object*) global context
- options - (*object*, optional) override some of the template instance options.	


Template Method: html 
--------------------

substitute the given object into the given template string and return DOM nodes.

### Syntax:

	var template = new Template();
	var nodes = template.html(string, data[, options]);
	
	document.body.adopt(nodes);

### Returns:

* (*string*)

### Arguments:

- string - (*string*) input template
- data - (*object*) global context
- options - (*object*, optional) override some of the template instance options.
	
Known Issues:
----------------

The template should not content identical nested tag/property tokens because this will lead to unpredictable result. this is because the first token will always match the closest matching token.
this template for example is not valid: '{repeat:name} {repeat:names}{whatevergoeshere} {/repeat:names} {/repeat:names}'