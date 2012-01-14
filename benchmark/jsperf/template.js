 /*
 
	comparing to implementations
 */
 
  Template.implement({
  
	//#1
		multiline: false,
		placeholder: '\u21b5',
		regExp: '{begin}([a-z0-9][a-z0-9-_]*):([a-z0-9_.-]*){end}(.*?){begin}\\/\\1:\\2{end}',
		
		substitute: function (string, data, options) {
		
			options = Object.append({}, this.options, options);
			
			var replace ={begin: options.begin.escapeRegExp(), end: options.end.escapeRegExp()},
				regExp = new RegExp(this.regExp.substitute(replace), 'i'),
				simplereg = new RegExp(('\\\\?{begin}([^' + (['[', ']'].indexOf(options.begin) != -1 ? replace.begin : replace.begin.replace(/\\/g, '')) + ']+){end}').substitute(replace), 'g');
			
			if(options.multiline) return this.parse(string.replace(/\n/g, options.placeholder), data, regExp, replace, simplereg, options).replace(new RegExp(options.placeholder.escapeRegExp(), 'g'), '\n');
			
			return this.parse(string, data, regExp, replace, simplereg, options)
		},
		
		parse: function (string, data, regExp, replace, simplereg, options) {
		
			if(data != undefined) {
				
				var matches = regExp.exec(string);

				if(matches) {

					var tag = matches[1], test, name = matches[2], context, el, html = '', subject;

					switch(tag) {


						case 'if':
						case 'defined':
						case 'empty':
						case 'not-empty':

								//switch context for object or array
								subject = this.evaluate(data, name);
								
								test = this.test(tag, subject);
								
								context = test && tag == 'if' && typeof subject == 'object';
								
								//if-else or something like that
								el = new RegExp('(.*?)' + replace.begin + 'else:' + name.escapeRegExp() + replace.end + '(.*)', 'i').exec(matches[3]);

								if(el) {

									if(!test) return this.parse(string.replace(matches[0], el[2]), data, regExp, replace, simplereg, options);

									if(context) return this.parse(string.replace(matches[0], this.parse(el[1], subject, regExp, replace, simplereg, options)), data, regExp, replace, simplereg, options);
									return this.parse(string.replace(matches[0], el[1]), data, regExp, replace, simplereg, options);
								}

								if(!test) return this.parse(string.replace(matches[0], ''), data, regExp, replace, simplereg, options);

								if(context) return this.parse(string.replace(matches[0], this.parse(matches[3], subject, regExp, replace, simplereg, options)), data, regExp, replace, simplereg, options);
								
								return this.parse(string.replace(matches[0], matches[3]), data, regExp, replace, simplereg, options);

						case 'repeat':
						case 'loop':
							
							subject = tag == 'loop' ? (typeof data == 'function' ? data() : data) : this.evaluate(data, name);
							
							if(!this.test(tag, subject)) return this.parse(string.replace(matches[0], ''), data, regExp, replace, simplereg, options);

							var value, property, single = new RegExp(replace.begin + '\.' + replace.end, 'g');
							
							//iterable - Array or Hash like
							if(typeof subject.each == 'function')  subject.each(function (value) {
							
								if(typeof value == 'function') value = value();
								
								if(value == undefined) return;
								
								html += typeof value != 'object' ? matches[3].replace(single, value) : this.parse(matches[3], value, regExp, replace,  simplereg, options)
							}, this);
							
							else for(property in subject) if(subject.hasOwnProperty(property)) {
							
								value = this.evaluate(subject, property);
								
								if(value == undefined) continue;
								
								//hopefully matches[3] should be a simple token. replace {.} by the property value
								html += typeof value != 'object' ? matches[3].replace(single, value) : this.parse(matches[3], value, regExp, replace,  simplereg, options)
							}
							
							return this.parse(string.replace(matches[0], html), data, regExp, replace, simplereg, options);
							
						default: 

							//custom tag parsing
							if(options.parse) return this.parse(string.replace(matches[0], options.parse(tag, matches, name, data, string, regExp, replace, simplereg, options) || ''), data, regExp, replace, simplereg, options);
					}
				}
			}
			
			return string.replace(simplereg, function(match, name) {
			
				if (match.charAt(0) == '\\') return match.slice(1);
				
				if(options.debug && name.indexOf(':') != -1) log('suspicious token found: "' + match + '", is the ' + (match.charAt(1) == '/' ? 'opening' : 'closing') + ' token missing ? ' + (string.indexOf('\n') != -1 ? ' try to set the option {multiline: true}' : ''), string);
				
				var value = this.evaluate(data, name);
				
				return value == undefined ? '' : value
				
			}.bind(this))
		},
	
	//#2
		string: function (string, data, options) {
		
			options = Object.append({}, this.options, options);
			
			var replace ={begin: options.begin.escapeRegExp(), end: options.end.escapeRegExp()},
				match = new RegExp('{begin}([a-z0-9][a-z0-9-_]*):([a-z0-9_.-]*){end}'.substitute(replace), 'i'),
				simplereg = new RegExp(('\\\\?{begin}([^' + (['[', ']'].indexOf(options.begin) != -1 ? replace.begin : replace.begin.replace(/\\/g, '')) + ']+){end}').substitute(replace), 'g');
			
			return this._string(string, replace, match, simplereg, data, options)
		},
		
		_string: function (string, replace, match, simplereg, data, options) {
		
			var matches;
				
			if(data != undefined) {
				
				do {
					
					matches = match.exec(string);

					if(matches) {
						
						var open,
							close,
							
							index, //index of the first match
							index2,//index of the last match
							index3,//index of the {else: ...} match
							tag,
							test,
							name, 
							context, 
							//el, 
							elseif,
							html, 
							subject,
							partial,
							substring;
							

						tag = matches[1];
						name = matches[2];
						
						open = options.begin + tag + ':' + name + options.end;
						close = options.begin + '/' + tag + ':' + name + options.end;
						
						index2 = string.indexOf(close);
						
						if(index2 == -1) {
						
							if(options.debug && name.indexOf(':') != -1) log('suspicious token found: "' + match + '", is the closing token missing ?', string);
							string = string.replace(open, '')
						}
						
						index = string.indexOf(open);
						
						substring = string.substring(index + open.length, index2);
						partial = open + substring + close;
						
						switch(tag) {

							case 'if':
							case 'defined':
							case 'empty':
							case 'not-empty':

									//switch context for object or array
									subject = this.evaluate(data, name);
									
									test = this.test(tag, subject);
									
									context = test && tag == 'if' && typeof subject == 'object';
									elseif = options.begin + 'else:' + name + options.end;
									
									//if-else or something like that
									index3 = string.indexOf(elseif);
									
									if(index3 != -1) {

										if(!test) string = string.replace(partial, this._string(string.substring(index3 + elseif.length, index2), replace, match, simplereg, subject, options));

										else if(context) string = string.replace(partial, this._string(string.substring(index3 + elseif.length, index2), replace, match, simplereg, subject, options));
										else string = string.replace(partial, this._string(string.substring(index + open.length, index3), replace, match, simplereg, data, options));
									}
									
									else {
									
										if(!test) string = string.replace(partial, '');

										else if(context) string = string.replace(partial, this._string(substring, replace, match, simplereg, subject, options));
										else string = this._string(string.replace(partial, this._string(substring, data, options)), replace, match, simplereg, data, options);
									}
									
								break;
								
							case 'repeat':
							case 'loop':
								
								html = '';
								subject = tag == 'loop' ? (typeof data == 'function' ? data() : data) : this.evaluate(data, name);
								
								if(!this.test(tag, subject)) string = string.replace(partial, '');
								
								else {
									
									var value, property, single = new RegExp(options.begin.escapeRegExp() + '\.' + options.end.escapeRegExp(), 'g');
									
									//iterable - Array or Hash like
									if(typeof subject.each == 'function')  subject.each(function (value) {
									
										if(typeof value == 'function') value = value();
										
										if(value == undefined) return;
										
										html += typeof value != 'object' ? substring.replace(single, value) : this._string(substring, replace, match, simplereg, value, options)
									}, this);
									
									else for(property in subject) if(subject.hasOwnProperty(property)) {
									
										value = this.evaluate(subject, property);
										
										if(value == undefined) continue;
										
										//hopefully matches[3] should be a simple token. replace {.} by the property value
										html += typeof value != 'object' ? substring.replace(single, value) : this._string(substring, replace, match, simplereg, value, options)
									}
									
									string = string.replace(partial, html)
								}
								
								break;

							default: 
							
								var tmp = options.parse(tag, matches, name, data, string, options);
								
								string = string.replace(partial, tmp == undefined ? '' : tmp)
						}
					}
				}
				
				while(matches)
			}
			
			//log(simplereg)
			return string.replace(simplereg, function(match, name) {
			
				if (match.charAt(0) == '\\') return match.slice(1);
				
				if(options.debug && name.indexOf(':') != -1) console.log('suspicious token found: "' + match + '", is the opening token missing ?', string);
				
				var value = this.evaluate(data, name);
				
				return value == undefined ? '' : value
				
			}.bind(this))
		}	
	});
		  