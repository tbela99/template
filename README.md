Template
============

Template is fast and context aware template engine with conditional replacement, iterations and filters.
Compare to Mustache.js and Hogan.js [here](http://jsperf.com/template-mustachejs-hogan) and [here](http://jsperf.com/template-mustachejs-hogan/2)

- [Demo](http://jsfiddle.net/tbela99/ygWKc/1/)

How to use
---------------------

Substitution is driven by tags that define which action will be taken and whether the context should be switched.

## Basic usage

	var template = 'Hi, my name is {name}';

	new Template().substitute(template, {name: 'Bob'}) // -> Hi, my name is Bob
	
	//using custom tag delimiters
	new Template({begin: '[[', end: ']]'}).substitute('Hi, my name is [[name]]', {name: 'Bob'}) // -> Hi, my name is Bob
	
	//changing options after
	new Template().setOptions({begin: '[[', end: ']]'}).substitute('Hi, my name is [[name]]', {name: 'Bob'}) // -> Hi, my name is Bob
	
## Compilation

You can compile template for better performances.

	var render = new Template().compile('<span>Hi, my name is {name}</span>');

	// render as string
	render({name: 'Bob'}) // -> <span>Hi, my name is Bob</span>
	
	// render as an array of Elements
	render({name: 'Bob'}, true) // -> [<span>]
	
## Logic test

You can apply some if-else logic (there are also other logic tests like defined, empty, not-empty).
Note the if-else test switch the context if the evaluated property is an object (if typeof data[property] == 'object')

	var data = {name: 'Bob'};
	
	new Template().substitute('{name} is a{if:win} winner!{else:win} looser!{/if:win}', data) // -> Bob is a looser!
	
	//switch the context here to data.kids
	data = {kids: [1, 2, 3, 4]};
	
	new Template().substitute('{if:kids}I have {length} kids{/if:kids}', data) // -> I have 4 kids
	
	//context is not switched here because data.kids is not an object.
	data = {kids: 1};
	
	new Template().substitute('{if:kids}I have {kids} kid{/if:kids}', data) // -> I have 1 kid
	
## Iteration

There are two way to iterate over data. You use *loop:* to iterate over every property of the current context and *repeat* to
iterate over a property of the current context.

	var data = {list: [1, 2, 3, 4]}
	
	new Template().substitute('{repeat:list} {.}{/repeat:list}', data) // -> 1 2 3 4
	
	//data.list is the context here
	new Template().substitute('{loop:} {.}{/loop:}', data.list) // -> 1 2 3 4
	
## Filtering data
	
You can alter data before there are applied to the template using filters. filters can be used with any predifined tag (or custom tags).
You can apply multiple filters at once, they must be separated by one or more spaces. you can't supply parameters to filters.

	var data = {list: [1, 2, 3, 4]},
		template = new Template();
		
		
	template.addFilter('reverse', function (data) {
	
		if(data instanceof Array) return data.reverse();
		
		var stack = [];
		
		for(var prop in data) stack.unshift(data[prop]);
		
		return stack
	}).
	addFilter('even', function (data) {
	
		
		return data.filter(function (value) {
		
			return !isNaN(value) && value % 2 == 0
		})
	});
		
	template.substitute('{repeat:list reverse} {.}{/repeat:list}', data) // -> 4 3 2 1
	template.substitute('{repeat:list even} {.}{/repeat:list}', data) // -> 2 4
	
	//You can even apply multiple filters
	template.substitute('{repeat:list even reverse} {.}{/repeat:list}', data) // -> 4 2
	
## Rendering data with modifiers

You can alter data before they are rendered using modifiers. You can pass parameters to modifiers by simply adding them after the modifier name, they must be separated by one or more spaces
	
	var data = {list: [1, 2, 3, 4]},
		template = new Template();
		
	template.addModifier('sum', function (data) {
	
		var sum = 0, i;
		
		for(i = 0; i < data.length; i++) if(!isNaN(data[i])) sum += data[i];
		
		return sum
	}).
	addModifier('product', function (data) {
	
		var product = 1, i;
		
		for(i = 0; i < data.length; i++) if(!isNaN(data[i])) product *= data[i];
		
		return product
	});
		
	template.substitute('the sum is {sum} and the product is {product}', data.list) // -> the sum is 10 and the product is 24
	
Passing parameters to a modifier function

	var data = {firstname: 'Bob', lastname: 'Malone'},
		template = new Template().addModifier({
		
			changeCase: function (data, property, how) {
			
				switch(how) {
				
					case 'uppercase': return data[property].toUpperCase(); 
					case 'lowercase': return data[property].toLowerCase(); 
				}
				
				return data[property]
			}
		});
		
	//parameters #1 firstname and uppercase, #2 lastname and lowercase
	template.substitute('{changeCase firstname uppercase} {changeCase lastname lowercase}', data) //-> BOB malone
	
In the previous example I passed the property name and how the case will be changed. The example below formats a number into formatted file size
		
	//display formatted file size
	Number.implement({
		
		toFileSize: function(units) {
		
			if(this == 0) return 0;
			
			var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'],
				e = Math.floor(Math.log(this) / Math.log(1024));

			return (this / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + (units && units[e] ? units[e] : s[e]);
		}
	});
	
	var template = new Template().addModifier('toFileSize', function (data, property) {
	
		return (+data[property]).toFileSize()
		
	});
	
	template.substitute('File {name} size {toFileSize size}', {name: 'Bob.jpg', size: 14578559}); // -> File: "Bob.jpg", size: 13.90 MB 
	
# Extending with your own tag

You can provide your own function to parse custom tags. filters are not applied to the data. You will apply them yourself

 var template = new Template();
 
	template.setOptions({parse: function (tag, property, substring, data, options, filters) {
	
		//apply filters
		if(filters) for(var i = 0; i < filters.length; i++) data = options.filters[filters[i]](data);
		
		var string = '';
		
		//do stuff
		//...
		
		
		return string
	}})

## Template Tag: IF  {#Tag:if}

Tests if the given property exists and is not a falsy value. the context may be switched if the property is evaluated to an object.

### Syntax:

 {if:property} match1 [{else:property} match2]{/if:property}

### Rules

- if the property does not exists or is evaluated to a falsy value (undefined, null, false, an empty string, an empty array or zero) then match2 is used in the current context.
- if the property exists in the currrent context then match1 is used. if the property is evaluated to an object, the replacement context of match1 is switched to that object, else match1 will be used in the current context.


## Template Tag: DEFINED {#Tag:defined}

tests if the given property exists and is not null or undefined. the context is not switched. 

### Syntax:

	{defined:property} match1 [{else:property} match2]{/defined:property}

### Rules

- if the property exists and is not undefined or null then match1 is used in the current context, else match2 is used in the current context

Syntax: {if:property} match1 [{else:property} match2]{/if:property}

## Template Tag: NOT-EMPTY {#Tag:not-empty}

tests if the given property exists and is not a falsy value (undefined, null, false, an empty string, an empty array or zero). the context is not switched

### Syntax: 

	{not-empty:property} match1 [{else:property} match2]{/not-empty:property}

### Rules

- if the property exists and is evaluated to a not a falsy value then match1 is used in the current context, else match2 is used in the current context

## Template Tag: EMPTY {#Tag:empty}

tests if the given property does not exists or is a falsy value (undefined, null, false, an empty string, an empty array or zero).

### Syntax: 

	{empty:property} match1 [{else:property} match2]{/empty:property}

### Rules

- if the property does not exists or is evaluated to a falsy value then match1 is used in the current context, else match2 is used in the current context

## Template Tag: REPEAT {#Tag:repeat}

Iterates over the given property

### Syntax: 
	
	{repeat:property} match1{/repeat:property}

### Rules

- if the property is evaluated to a an array then every elements will be susbstituted to match1. if the result of the evaluation is an object and that object contains a property 'each' which is a function, this property will be used to iterate over the object properties. if match1 contains '{.}' then '{.}' will be replaced by the current property value.

## Template Tag: LOOP {#Tag:loop}

this tag works exactly like the *repeat* tag, but iteration is done over the current context.

Syntax: {loop:} match1{/loop:}

# Template Class {#template:constructor}

### Syntax:

	var template = new Template([options]);
	
### Arguments:

- options - (*object*, optional)

#### Options:

* begin - (*string*, optional) opening token delimiter, default to *{*.
* end - (*string*, optional) closing token delimiter, default to *}*.
* debug - (*boolean*, optional) log messages in the console if there are token with no match.
* parse - (*function*, optional) function called when an unknown tag is found. you can use this to handle your custom tag

##### Options:parse Arguments

- tag - (*string*) tag name
- property - (*string*) property name
- template - (*string*)
- data - (*mixed*) current context
- options - (*object*) a mix of template options, filters and modifiers. the filters properties contains all avalaible filters and the modifiers property contains all avalaible modifiers 
- filters - (*array*) list of filters name data should be applied to data

Template Method: substitute 
--------------------

substitute the given object into the given string template.

### Syntax:

	var template = new Template();
	
	var output = template.substitute(string, data);

### Returns:

* (*string*)

### Arguments:

- string - (*string*) input template
- data - (*object*) global context


Template Method: compile 
--------------------

compile the given template to a function for optimal performances. after a call to setOptions, addFilter or addModifier, the previously returned result becomes obsolete.
the function return a string. the function accept a second optional parameter. if this parameter is set to true, the function will return an array of Elements.

### Syntax:

	var render = new Template().compile(string[, options]);
	
	// render as string
	string = render(data);
	
	// render as an array of HTML elements
	document.body.adopt(Elements.from(render(data, true)));

### Returns:

* (*function*)

### Arguments:

- data - (*object*)
- html - (*boolean*) optional, return an array of HTML elements instead of string
	

Template Method: html 
--------------------

substitute the given object into the given template string and return DOM nodes.

### Syntax:

	var template = new Template();
	var nodes = template.html(string, data);
	
	document.body.adopt(nodes);

### Returns:

* (*array*)

### Arguments:

- string - (*string*) input template
- data - (*object*) global context
	

Template Method: setOptions 
--------------------

set template options.

### Syntax:

	var template = new Template();
	
	//syntax #1
	template.setOptions({begin: '[[', end: ']]'});
	
Template Method: addFilter 
--------------------

allow you to alter the data actually replaced in a given tag. this function accepts either a property name/function or an object with properties names as keys and functions as values.
you can apply multiple filter to a tag, they must be separed by one or many spaces.

### Syntax:

	var template = new Template();
	
	//syntax #1
	template.addFilter('filter', function (data) {
	
		values = [];
		
		//some code logic here ...
		
		return values
	});
	
	//syntax #2
	template.addFilter({
	
		odd: function (data) {
		
			return Object.filter(data, function (value, key) { return key % 2 == 1 })
		},
		even: function (data) {
		
			return Object.filter(data, function (value, key) { return key % 2 == 0 })
		}
	});
	
### Returns:

* (*object*) this Template instance

### Example:

	var	template = new Template().addFilter({reverse: function (data) {
	
				var values = [];
				
				Object.each(data, function (value) { values.unshift(value) });
				
				return values
			
			},
			boys: function (data) {
		
				var values = [];
				
				Object.each(data, function (value) { if(value.sex == 'M') values.push(value) });
				
				return values
				
			}
		),
		tmpl = ' Hi, my name is {name}.{if:kids} I have {length} lovely kids: <ul>{loop: reverse}<li>{name}</li>{/loop:}</ul>.{/if:kids}<br/>',
		data = {
					name: 'Emily', 
					kids: [
						{name: 'Brian', sex: 'M'},
						{name: 'Edith', sex: 'F'}, 
						{name: 'Spider man', sex: 'M'}
					]
				};
	
	//kids appear in reversed order
	document.body.appendText(template.substitute(tmpl, data)) // ->  Hi, my name is Emily. I have 3 lovely kids: <ul><li>Spider man</li><li>Edith</li><li>Brian</li></ul>.<br/>
	
	//how many boyz I got ?
	document.body.appendText(template.substitute('{if:kids boys} I have {length} boys.{/if:kids}', data)) // ->   I have 2 boys

### Filter function Arguments:

- data - (*mixed*) values being replaced
	
### Filter function Returns:

- (*mixed*) values that will actually be used for replacement
	

Template Method: addModifier 
--------------------

allow you to handle string remplacement with a custom function. this function accepts either a property name/function or an object with properties names as keys and functions as values

### Syntax:

	var template = new Template();
	
	//syntax #1
	template.addModifier('myname', function (data) {
	
		return 'my name is ' + data.name
	});
	
	//syntax #2
	template.addModifier({
		fullname: function (data) { return data.name + ' ' + data.lastname }, 
		othername: function (data) { return 'my other name is ' + data.othername }
	});
	
	document.body.adopt(nodes);

### Returns:

* (*object*) this Template instance

### Example:

	var tmpl = 'Hi, my name is {fullname}',
		data = {name: 'Bob', lastname: 'Malone'};
	
	document.body.appendText(new Template().addModifier('fullname', function (data) {
	
		return '"' + data.name + ' ' + data.lastname + '"'
		
	}).substitute(tmpl, data)) // -> Hi, my name is "Bob Malone"	

### Modifier function Arguments:

- data - (*mixed*) replacement context
- property - (*string*) property name.
	
Known Issues:
-------------

The template should not contain identical nested tag/property tokens because this will lead to unpredictable result. this is because the first token will always match the nearest closing match.
this template for example is not valid: '{repeat:name} {repeat:names}{whatevergoeshere} {/repeat:names} {/repeat:names}'