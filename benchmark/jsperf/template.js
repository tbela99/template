 /*
 
	comparing two implementations
 */
 
  Template.implement({
  
		substitute2: function (string, data, options) {
		
			options = Object.append({}, this.options, options);
			
			var replace ={begin: options.begin.escapeRegExp(), end: options.end.escapeRegExp()},
				match = new RegExp('{begin}([a-z0-9][a-z0-9-_]*):([a-z0-9_.-]*){end}'.substitute(replace), 'i'),
				simplereg = new RegExp(('\\\\?{begin}([^' + (['[', ']'].indexOf(options.begin) != -1 ? replace.begin : replace.begin.replace(/\\/g, '')) + ']+){end}').substitute(replace), 'g');
			
			return this.parse2(string, replace, match, simplereg, data, options)
		},
		
		parse2: function (string, replace, match, simplereg, data, options) {
		
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

										if(!test) string = string.replace(partial, this.parse2(string.substring(index3 + elseif.length, index2), replace, match, simplereg, subject, options));

										else if(context) string = string.replace(partial, this.parse2(string.substring(index3 + elseif.length, index2), replace, match, simplereg, subject, options));
										else string = string.replace(partial, this.parse2(string.substring(index + open.length, index3), replace, match, simplereg, data, options));
									}
									
									else {
									
										if(!test) string = string.replace(partial, '');

										else if(context) string = string.replace(partial, this.parse2(substring, replace, match, simplereg, subject, options));
										else string = this.parse2(string.replace(partial, this.parse2(substring, data, options)), replace, match, simplereg, data, options);
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
										
										html += typeof value != 'object' ? substring.replace(single, value) : this.parse2(substring, replace, match, simplereg, value, options)
									}, this);
									
									else for(property in subject) if(subject.hasOwnProperty(property)) {
									
										value = this.evaluate(subject, property);
										
										if(value == undefined) continue;
										
										//hopefully matches[3] should be a simple token. replace {.} by the property value
										html += typeof value != 'object' ? substring.replace(single, value) : this.parse2(substring, replace, match, simplereg, value, options)
									}
									
									string = string.replace(partial, html)
								}
								
								break;

							default: 
							
								var tmp = options.parse2(tag, matches, name, data, string, options);
								
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
		  