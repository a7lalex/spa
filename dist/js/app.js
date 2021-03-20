/*

 Software License Agreement (BSD License)
 http://taffydb.com
 Copyright (c)
 All rights reserved.


 Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following condition is met:

 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 */

/*jslint        browser : true, continue : true,
 devel  : true, indent  : 2,    maxerr   : 500,
 newcap : true, nomen   : true, plusplus : true,
 regexp : true, sloppy  : true, vars     : false,
 white  : true
*/

// BUILD 193d48d, modified by mmikowski to pass jslint

// Setup TAFFY name space to return an object with methods
var TAFFY, exports, T;
(function () {
  'use strict';

  var typeList, makeTest, idx, typeKey, version, TC, idpad, cmax, API, protectJSON, each, eachin, isIndexable, returnFilter, runFilters, numcharsplit, orderByCol, run, intersection, filter, makeCid, safeForJson, isRegexp, sortArgs;

  if (!TAFFY) {
    // TC = Counter for Taffy DBs on page, used for unique IDs
    // cmax = size of charnumarray conversion cache
    // idpad = zeros to pad record IDs with
    version = '2.7';
    TC = 1;
    idpad = '000000';
    cmax = 1000;
    API = {};

    sortArgs = function (args) {
      var v = Array.prototype.slice.call(args);
      return v.sort();
    };

    protectJSON = function (t) {
      // ****************************************
      // *
      // * Takes: a variable
      // * Returns: the variable if object/array or the parsed variable if JSON
      // *
      // ****************************************  
      if (TAFFY.isArray(t) || TAFFY.isObject(t)) {
        return t;
      } else {
        return JSON.parse(t);
      }
    };

    // gracefully stolen from underscore.js
    intersection = function (array1, array2) {
      return filter(array1, function (item) {
        return array2.indexOf(item) >= 0;
      });
    };

    // gracefully stolen from underscore.js
    filter = function (obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      if (Array.prototype.filter && obj.filter === Array.prototype.filter) return obj.filter(iterator, context);
      each(obj, function (value, index, list) {
        if (iterator.call(context, value, index, list)) results[results.length] = value;
      });
      return results;
    };

    isRegexp = function (aObj) {
      return Object.prototype.toString.call(aObj) === '[object RegExp]';
    };

    safeForJson = function (aObj) {
      var myResult = T.isArray(aObj) ? [] : T.isObject(aObj) ? {} : null;
      if (aObj === null) return aObj;
      for (var i in aObj) {
        myResult[i] = isRegexp(aObj[i]) ? aObj[i].toString() : T.isArray(aObj[i]) || T.isObject(aObj[i]) ? safeForJson(aObj[i]) : aObj[i];
      }
      return myResult;
    };

    makeCid = function (aContext) {
      var myCid = JSON.stringify(aContext);
      if (myCid.match(/regex/) === null) return myCid;
      return JSON.stringify(safeForJson(aContext));
    };

    each = function (a, fun, u) {
      var r, i, x, y;
      // ****************************************
      // *
      // * Takes:
      // * a = an object/value or an array of objects/values
      // * f = a function
      // * u = optional flag to describe how to handle undefined values
      //   in array of values. True: pass them to the functions,
      //   False: skip. Default False;
      // * Purpose: Used to loop over arrays
      // *
      // ****************************************  
      if (a && (T.isArray(a) && a.length === 1 || !T.isArray(a))) {
        fun(T.isArray(a) ? a[0] : a, 0);
      } else {
        for (r, i, x = 0, a = T.isArray(a) ? a : [a], y = a.length; x < y; x++) {
          i = a[x];
          if (!T.isUndefined(i) || u || false) {
            r = fun(i, x);
            if (r === T.EXIT) {
              break;
            }
          }
        }
      }
    };

    eachin = function (o, fun) {
      // ****************************************
      // *
      // * Takes:
      // * o = an object
      // * f = a function
      // * Purpose: Used to loop over objects
      // *
      // ****************************************  
      var x = 0,
          r,
          i;

      for (i in o) {
        if (o.hasOwnProperty(i)) {
          r = fun(o[i], i, x++);
          if (r === T.EXIT) {
            break;
          }
        }
      }
    };

    API.extend = function (m, f) {
      // ****************************************
      // *
      // * Takes: method name, function
      // * Purpose: Add a custom method to the API
      // *
      // ****************************************  
      API[m] = function () {
        return f.apply(this, sortArgs(arguments));
      };
    };

    isIndexable = function (f) {
      var i;
      // Check to see if record ID
      if (T.isString(f) && /[t][0-9]*[r][0-9]*/i.test(f)) {
        return true;
      }
      // Check to see if record
      if (T.isObject(f) && f.___id && f.___s) {
        return true;
      }

      // Check to see if array of indexes
      if (T.isArray(f)) {
        i = true;
        each(f, function (r) {
          if (!isIndexable(r)) {
            i = false;

            return TAFFY.EXIT;
          }
        });
        return i;
      }

      return false;
    };

    runFilters = function (r, filter) {
      // ****************************************
      // *
      // * Takes: takes a record and a collection of filters
      // * Returns: true if the record matches, false otherwise
      // ****************************************
      var match = true;

      each(filter, function (mf) {
        switch (T.typeOf(mf)) {
          case 'function':
            // run function
            if (!mf.apply(r)) {
              match = false;
              return TAFFY.EXIT;
            }
            break;
          case 'array':
            // loop array and treat like a SQL or
            match = mf.length === 1 ? runFilters(r, mf[0]) : mf.length === 2 ? runFilters(r, mf[0]) || runFilters(r, mf[1]) : mf.length === 3 ? runFilters(r, mf[0]) || runFilters(r, mf[1]) || runFilters(r, mf[2]) : mf.length === 4 ? runFilters(r, mf[0]) || runFilters(r, mf[1]) || runFilters(r, mf[2]) || runFilters(r, mf[3]) : false;
            if (mf.length > 4) {
              each(mf, function (f) {
                if (runFilters(r, f)) {
                  match = true;
                }
              });
            }
            break;
        }
      });

      return match;
    };

    returnFilter = function (f) {
      // ****************************************
      // *
      // * Takes: filter object
      // * Returns: a filter function
      // * Purpose: Take a filter object and return a function that can be used to compare
      // * a TaffyDB record to see if the record matches a query
      // ****************************************  
      var nf = [];
      if (T.isString(f) && /[t][0-9]*[r][0-9]*/i.test(f)) {
        f = { ___id: f };
      }
      if (T.isArray(f)) {
        // if we are working with an array

        each(f, function (r) {
          // loop the array and return a filter func for each value
          nf.push(returnFilter(r));
        });
        // now build a func to loop over the filters and return true if ANY of the filters match
        // This handles logical OR expressions
        f = function () {
          var that = this,
              match = false;
          each(nf, function (f) {
            if (runFilters(that, f)) {
              match = true;
            }
          });
          return match;
        };
        return f;
      }
      // if we are dealing with an Object
      if (T.isObject(f)) {
        if (T.isObject(f) && f.___id && f.___s) {
          f = { ___id: f.___id };
        }

        // Loop over each value on the object to prep match type and match value
        eachin(f, function (v, i) {

          // default match type to IS/Equals
          if (!T.isObject(v)) {
            v = {
              'is': v
            };
          }
          // loop over each value on the value object  - if any
          eachin(v, function (mtest, s) {
            // s = match type, e.g. is, hasAll, like, etc
            var c = [],
                looper;

            // function to loop and apply filter
            looper = s === 'hasAll' ? function (mtest, func) {
              func(mtest);
            } : each;

            // loop over each test
            looper(mtest, function (mtest) {

              // su = match success
              // f = match false
              var su = true,
                  f = false,
                  matchFunc;

              // push a function onto the filter collection to do the matching
              matchFunc = function () {

                // get the value from the record
                var mvalue = this[i],
                    eqeq = '==',
                    bangeq = '!=',
                    eqeqeq = '===',
                    lt = '<',
                    gt = '>',
                    lteq = '<=',
                    gteq = '>=',
                    bangeqeq = '!==',
                    r;

                if (typeof mvalue === 'undefined') {
                  return false;
                }

                if (s.indexOf('!') === 0 && s !== bangeq && s !== bangeqeq) {
                  // if the filter name starts with ! as in '!is' then reverse the match logic and remove the !
                  su = false;
                  s = s.substring(1, s.length);
                }
                // get the match results based on the s/match type
                /*jslint eqeq : true */
                r = s === 'regex' ? mtest.test(mvalue) : s === 'lt' || s === lt ? mvalue < mtest : s === 'gt' || s === gt ? mvalue > mtest : s === 'lte' || s === lteq ? mvalue <= mtest : s === 'gte' || s === gteq ? mvalue >= mtest : s === 'left' ? mvalue.indexOf(mtest) === 0 : s === 'leftnocase' ? mvalue.toLowerCase().indexOf(mtest.toLowerCase()) === 0 : s === 'right' ? mvalue.substring(mvalue.length - mtest.length) === mtest : s === 'rightnocase' ? mvalue.toLowerCase().substring(mvalue.length - mtest.length) === mtest.toLowerCase() : s === 'like' ? mvalue.indexOf(mtest) >= 0 : s === 'likenocase' ? mvalue.toLowerCase().indexOf(mtest.toLowerCase()) >= 0 : s === eqeqeq || s === 'is' ? mvalue === mtest : s === eqeq ? mvalue == mtest : s === bangeqeq ? mvalue !== mtest : s === bangeq ? mvalue != mtest : s === 'isnocase' ? mvalue.toLowerCase ? mvalue.toLowerCase() === mtest.toLowerCase() : mvalue === mtest : s === 'has' ? T.has(mvalue, mtest) : s === 'hasall' ? T.hasAll(mvalue, mtest) : s === 'contains' ? TAFFY.isArray(mvalue) && mvalue.indexOf(mtest) > -1 : s.indexOf('is') === -1 && !TAFFY.isNull(mvalue) && !TAFFY.isUndefined(mvalue) && !TAFFY.isObject(mtest) && !TAFFY.isArray(mtest) ? mtest === mvalue[s] : T[s] && T.isFunction(T[s]) && s.indexOf('is') === 0 ? T[s](mvalue) === mtest : T[s] && T.isFunction(T[s]) ? T[s](mvalue, mtest) : false;
                /*jslint eqeq : false */
                r = r && !su ? false : !r && !su ? true : r;

                return r;
              };
              c.push(matchFunc);
            });
            // if only one filter in the collection push it onto the filter list without the array
            if (c.length === 1) {

              nf.push(c[0]);
            } else {
              // else build a function to loop over all the filters and return true only if ALL match
              // this is a logical AND
              nf.push(function () {
                var that = this,
                    match = false;
                each(c, function (f) {
                  if (f.apply(that)) {
                    match = true;
                  }
                });
                return match;
              });
            }
          });
        });
        // finally return a single function that wraps all the other functions and will run a query
        // where all functions have to return true for a record to appear in a query result
        f = function () {
          var that = this,
              match = true;
          // faster if less than  4 functions
          match = nf.length === 1 && !nf[0].apply(that) ? false : nf.length === 2 && (!nf[0].apply(that) || !nf[1].apply(that)) ? false : nf.length === 3 && (!nf[0].apply(that) || !nf[1].apply(that) || !nf[2].apply(that)) ? false : nf.length === 4 && (!nf[0].apply(that) || !nf[1].apply(that) || !nf[2].apply(that) || !nf[3].apply(that)) ? false : true;
          if (nf.length > 4) {
            each(nf, function (f) {
              if (!runFilters(that, f)) {
                match = false;
              }
            });
          }
          return match;
        };
        return f;
      }

      // if function
      if (T.isFunction(f)) {
        return f;
      }
    };

    orderByCol = function (ar, o) {
      // ****************************************
      // *
      // * Takes: takes an array and a sort object
      // * Returns: the array sorted
      // * Purpose: Accept filters such as "[col], [col2]" or "[col] desc" and sort on those columns
      // *
      // ****************************************

      var sortFunc = function (a, b) {
        // function to pass to the native array.sort to sort an array
        var r = 0;

        T.each(o, function (sd) {
          // loop over the sort instructions
          // get the column name
          var o, col, dir, c, d;
          o = sd.split(' ');
          col = o[0];

          // get the direction
          dir = o.length === 1 ? "logical" : o[1];

          if (dir === 'logical') {
            // if dir is logical than grab the charnum arrays for the two values we are looking at
            c = numcharsplit(a[col]);
            d = numcharsplit(b[col]);
            // loop over the charnumarrays until one value is higher than the other
            T.each(c.length <= d.length ? c : d, function (x, i) {
              if (c[i] < d[i]) {
                r = -1;
                return TAFFY.EXIT;
              } else if (c[i] > d[i]) {
                r = 1;
                return TAFFY.EXIT;
              }
            });
          } else if (dir === 'logicaldesc') {
            // if logicaldesc than grab the charnum arrays for the two values we are looking at
            c = numcharsplit(a[col]);
            d = numcharsplit(b[col]);
            // loop over the charnumarrays until one value is lower than the other
            T.each(c.length <= d.length ? c : d, function (x, i) {
              if (c[i] > d[i]) {
                r = -1;
                return TAFFY.EXIT;
              } else if (c[i] < d[i]) {
                r = 1;
                return TAFFY.EXIT;
              }
            });
          } else if (dir === 'asec' && a[col] < b[col]) {
            // if asec - default - check to see which is higher
            r = -1;
            return T.EXIT;
          } else if (dir === 'asec' && a[col] > b[col]) {
            // if asec - default - check to see which is higher
            r = 1;
            return T.EXIT;
          } else if (dir === 'desc' && a[col] > b[col]) {
            // if desc check to see which is lower
            r = -1;
            return T.EXIT;
          } else if (dir === 'desc' && a[col] < b[col]) {
            // if desc check to see which is lower
            r = 1;
            return T.EXIT;
          }
          // if r is still 0 and we are doing a logical sort than look to see if one array is longer than the other
          if (r === 0 && dir === 'logical' && c.length < d.length) {
            r = -1;
          } else if (r === 0 && dir === 'logical' && c.length > d.length) {
            r = 1;
          } else if (r === 0 && dir === 'logicaldesc' && c.length > d.length) {
            r = -1;
          } else if (r === 0 && dir === 'logicaldesc' && c.length < d.length) {
            r = 1;
          }

          if (r !== 0) {
            return T.EXIT;
          }
        });
        return r;
      };
      // call the sort function and return the newly sorted array
      return ar && ar.push ? ar.sort(sortFunc) : ar;
    };

    // ****************************************
    // *
    // * Takes: a string containing numbers and letters and turn it into an array
    // * Returns: return an array of numbers and letters
    // * Purpose: Used for logical sorting. String Example: 12ABC results: [12,'ABC']
    // **************************************** 
    (function () {
      // creates a cache for numchar conversions
      var cache = {},
          cachcounter = 0;
      // creates the numcharsplit function
      numcharsplit = function (thing) {
        // if over 1000 items exist in the cache, clear it and start over
        if (cachcounter > cmax) {
          cache = {};
          cachcounter = 0;
        }

        // if a cache can be found for a numchar then return its array value
        return cache['_' + thing] || function () {
          // otherwise do the conversion
          // make sure it is a string and setup so other variables
          var nthing = String(thing),
              na = [],
              rv = '_',
              rt = '',
              x,
              xx,
              c;

          // loop over the string char by char
          for (x = 0, xx = nthing.length; x < xx; x++) {
            // take the char at each location
            c = nthing.charCodeAt(x);
            // check to see if it is a valid number char and append it to the array.
            // if last char was a string push the string to the charnum array
            if (c >= 48 && c <= 57 || c === 46) {
              if (rt !== 'n') {
                rt = 'n';
                na.push(rv.toLowerCase());
                rv = '';
              }
              rv = rv + nthing.charAt(x);
            } else {
              // check to see if it is a valid string char and append to string
              // if last char was a number push the whole number to the charnum array
              if (rt !== 's') {
                rt = 's';
                na.push(parseFloat(rv));
                rv = '';
              }
              rv = rv + nthing.charAt(x);
            }
          }
          // once done, push the last value to the charnum array and remove the first uneeded item
          na.push(rt === 'n' ? parseFloat(rv) : rv.toLowerCase());
          na.shift();
          // add to cache
          cache['_' + thing] = na;
          cachcounter++;
          // return charnum array
          return na;
        }();
      };
    })();

    // ****************************************
    // *
    // * Runs a query
    // **************************************** 


    run = function () {
      this.context({
        results: this.getDBI().query(this.context())
      });
    };

    API.extend('filter', function () {
      // ****************************************
      // *
      // * Takes: takes unlimited filter objects as arguments
      // * Returns: method collection
      // * Purpose: Take filters as objects and cache functions for later lookup when a query is run
      // **************************************** 
      var nc = TAFFY.mergeObj(this.context(), { run: null }),
          nq = [];
      each(nc.q, function (v) {
        nq.push(v);
      });
      nc.q = nq;
      // Hadnle passing of ___ID or a record on lookup.
      each(sortArgs(arguments), function (f) {
        nc.q.push(returnFilter(f));
        nc.filterRaw.push(f);
      });

      return this.getroot(nc);
    });

    API.extend('order', function (o) {
      // ****************************************
      // *
      // * Purpose: takes a string and creates an array of order instructions to be used with a query
      // ****************************************

      o = o.split(',');
      var x = [],
          nc;

      each(o, function (r) {
        x.push(r.replace(/^\s*/, '').replace(/\s*$/, ''));
      });

      nc = TAFFY.mergeObj(this.context(), { sort: null });
      nc.order = x;

      return this.getroot(nc);
    });

    API.extend('limit', function (n) {
      // ****************************************
      // *
      // * Purpose: takes a limit number to limit the number of rows returned by a query. Will update the results
      // * of a query
      // **************************************** 
      var nc = TAFFY.mergeObj(this.context(), {}),
          limitedresults;

      nc.limit = n;

      if (nc.run && nc.sort) {
        limitedresults = [];
        each(nc.results, function (i, x) {
          if (x + 1 > n) {
            return TAFFY.EXIT;
          }
          limitedresults.push(i);
        });
        nc.results = limitedresults;
      }

      return this.getroot(nc);
    });

    API.extend('start', function (n) {
      // ****************************************
      // *
      // * Purpose: takes a limit number to limit the number of rows returned by a query. Will update the results
      // * of a query
      // **************************************** 
      var nc = TAFFY.mergeObj(this.context(), {}),
          limitedresults;

      nc.start = n;

      if (nc.run && nc.sort && !nc.limit) {
        limitedresults = [];
        each(nc.results, function (i, x) {
          if (x + 1 > n) {
            limitedresults.push(i);
          }
        });
        nc.results = limitedresults;
      } else {
        nc = TAFFY.mergeObj(this.context(), { run: null, start: n });
      }

      return this.getroot(nc);
    });

    API.extend('update', function (arg0, arg1, arg2) {
      // ****************************************
      // *
      // * Takes: a object and passes it off DBI update method for all matched records
      // **************************************** 
      var runEvent = true,
          o = {},
          args = sortArgs(arguments),
          that;
      if (TAFFY.isString(arg0) && (arguments.length === 2 || arguments.length === 3)) {
        o[arg0] = arg1;
        if (arguments.length === 3) {
          runEvent = arg2;
        }
      } else {
        o = arg0;
        if (args.length === 2) {
          runEvent = arg1;
        }
      }

      that = this;
      run.call(this);
      each(this.context().results, function (r) {
        var c = o;
        if (TAFFY.isFunction(c)) {
          c = c.apply(TAFFY.mergeObj(r, {}));
        } else {
          if (T.isFunction(c)) {
            c = c(TAFFY.mergeObj(r, {}));
          }
        }
        if (TAFFY.isObject(c)) {
          that.getDBI().update(r.___id, c, runEvent);
        }
      });
      if (this.context().results.length) {
        this.context({ run: null });
      }
      return this;
    });
    API.extend('remove', function (runEvent) {
      // ****************************************
      // *
      // * Purpose: removes records from the DB via the remove and removeCommit DBI methods
      // **************************************** 
      var that = this,
          c = 0;
      run.call(this);
      each(this.context().results, function (r) {
        that.getDBI().remove(r.___id);
        c++;
      });
      if (this.context().results.length) {
        this.context({
          run: null
        });
        that.getDBI().removeCommit(runEvent);
      }

      return c;
    });

    API.extend('count', function () {
      // ****************************************
      // *
      // * Returns: The length of a query result
      // **************************************** 
      run.call(this);
      return this.context().results.length;
    });

    API.extend('callback', function (f, delay) {
      // ****************************************
      // *
      // * Returns null;
      // * Runs a function on return of run.call
      // **************************************** 
      if (f) {
        var that = this;
        setTimeout(function () {
          run.call(that);
          f.call(that.getroot(that.context()));
        }, delay || 0);
      }

      return null;
    });

    API.extend('get', function () {
      // ****************************************
      // *
      // * Returns: An array of all matching records
      // **************************************** 
      run.call(this);
      return this.context().results;
    });

    API.extend('stringify', function () {
      // ****************************************
      // *
      // * Returns: An JSON string of all matching records
      // **************************************** 
      return JSON.stringify(this.get());
    });
    API.extend('first', function () {
      // ****************************************
      // *
      // * Returns: The first matching record
      // **************************************** 
      run.call(this);
      return this.context().results[0] || false;
    });
    API.extend('last', function () {
      // ****************************************
      // *
      // * Returns: The last matching record
      // **************************************** 
      run.call(this);
      return this.context().results[this.context().results.length - 1] || false;
    });

    API.extend('sum', function () {
      // ****************************************
      // *
      // * Takes: column to sum up
      // * Returns: Sums the values of a column
      // **************************************** 
      var total = 0,
          that = this;
      run.call(that);
      each(sortArgs(arguments), function (c) {
        each(that.context().results, function (r) {
          total = total + (r[c] || 0);
        });
      });
      return total;
    });

    API.extend('min', function (c) {
      // ****************************************
      // *
      // * Takes: column to find min
      // * Returns: the lowest value
      // **************************************** 
      var lowest = null;
      run.call(this);
      each(this.context().results, function (r) {
        if (lowest === null || r[c] < lowest) {
          lowest = r[c];
        }
      });
      return lowest;
    });

    //  Taffy innerJoin Extension (OCD edition)
    //  =======================================
    //
    //  How to Use
    //  **********
    //
    //  left_table.innerJoin( right_table, condition1 <,... conditionN> )
    //
    //  A condition can take one of 2 forms:
    //
    //    1. An ARRAY with 2 or 3 values:
    //    A column name from the left table, an optional comparison string,
    //    and column name from the right table.  The condition passes if the test
    //    indicated is true.   If the condition string is omitted, '===' is assumed.
    //    EXAMPLES: [ 'last_used_time', '>=', 'current_use_time' ], [ 'user_id','id' ]
    //
    //    2. A FUNCTION:
    //    The function receives a left table row and right table row during the
    //    cartesian join.  If the function returns true for the rows considered,
    //    the merged row is included in the result set.
    //    EXAMPLE: function (l,r){ return l.name === r.label; }
    //
    //  Conditions are considered in the order they are presented.  Therefore the best
    //  performance is realized when the least expensive and highest prune-rate
    //  conditions are placed first, since if they return false Taffy skips any
    //  further condition tests.
    //
    //  Other notes
    //  ***********
    //
    //  This code passes jslint with the exception of 2 warnings about
    //  the '==' and '!=' lines.  We can't do anything about that short of
    //  deleting the lines.
    //
    //  Credits
    //  *******
    //
    //  Heavily based upon the work of Ian Toltz.
    //  Revisions to API by Michael Mikowski.
    //  Code convention per standards in http://manning.com/mikowski
    (function () {
      var innerJoinFunction = function () {
        var fnCompareList, fnCombineRow, fnMain;

        fnCompareList = function (left_row, right_row, arg_list) {
          var data_lt, data_rt, op_code, error;

          if (arg_list.length === 2) {
            data_lt = left_row[arg_list[0]];
            op_code = '===';
            data_rt = right_row[arg_list[1]];
          } else {
            data_lt = left_row[arg_list[0]];
            op_code = arg_list[1];
            data_rt = right_row[arg_list[2]];
          }

          /*jslint eqeq : true */
          switch (op_code) {
            case '===':
              return data_lt === data_rt;
            case '!==':
              return data_lt !== data_rt;
            case '<':
              return data_lt < data_rt;
            case '>':
              return data_lt > data_rt;
            case '<=':
              return data_lt <= data_rt;
            case '>=':
              return data_lt >= data_rt;
            case '==':
              return data_lt == data_rt;
            case '!=':
              return data_lt != data_rt;
            default:
              throw String(op_code) + ' is not supported';
          }
          // 'jslint eqeq : false'  here results in
          // "Unreachable '/*jslint' after 'return'".
          // We don't need it though, as the rule exception
          // is discarded at the end of this functional scope
        };

        fnCombineRow = function (left_row, right_row) {
          var out_map = {},
              i,
              prefix;

          for (i in left_row) {
            if (left_row.hasOwnProperty(i)) {
              out_map[i] = left_row[i];
            }
          }
          for (i in right_row) {
            if (right_row.hasOwnProperty(i) && i !== '___id' && i !== '___s') {
              prefix = !TAFFY.isUndefined(out_map[i]) ? 'right_' : '';
              out_map[prefix + String(i)] = right_row[i];
            }
          }
          return out_map;
        };

        fnMain = function (table) {
          var right_table,
              i,
              arg_list = sortArgs(arguments),
              arg_length = arg_list.length,
              result_list = [];

          if (typeof table.filter !== 'function') {
            if (table.TAFFY) {
              right_table = table();
            } else {
              throw 'TAFFY DB or result not supplied';
            }
          } else {
            right_table = table;
          }

          this.context({
            results: this.getDBI().query(this.context())
          });

          TAFFY.each(this.context().results, function (left_row) {
            right_table.each(function (right_row) {
              var arg_data,
                  is_ok = true;
              CONDITION: for (i = 1; i < arg_length; i++) {
                arg_data = arg_list[i];
                if (typeof arg_data === 'function') {
                  is_ok = arg_data(left_row, right_row);
                } else if (typeof arg_data === 'object' && arg_data.length) {
                  is_ok = fnCompareList(left_row, right_row, arg_data);
                } else {
                  is_ok = false;
                }

                if (!is_ok) {
                  break CONDITION;
                } // short circuit
              }

              if (is_ok) {
                result_list.push(fnCombineRow(left_row, right_row));
              }
            });
          });
          return TAFFY(result_list)();
        };

        return fnMain;
      }();

      API.extend('join', innerJoinFunction);
    })();

    API.extend('max', function (c) {
      // ****************************************
      // *
      // * Takes: column to find max
      // * Returns: the highest value
      // ****************************************
      var highest = null;
      run.call(this);
      each(this.context().results, function (r) {
        if (highest === null || r[c] > highest) {
          highest = r[c];
        }
      });
      return highest;
    });

    API.extend('select', function () {
      // ****************************************
      // *
      // * Takes: columns to select values into an array
      // * Returns: array of values
      // * Note if more than one column is given an array of arrays is returned
      // **************************************** 

      var ra = [],
          args = sortArgs(arguments);
      run.call(this);
      if (arguments.length === 1) {

        each(this.context().results, function (r) {

          ra.push(r[args[0]]);
        });
      } else {
        each(this.context().results, function (r) {
          var row = [];
          each(args, function (c) {
            row.push(r[c]);
          });
          ra.push(row);
        });
      }
      return ra;
    });
    API.extend('distinct', function () {
      // ****************************************
      // *
      // * Takes: columns to select unique alues into an array
      // * Returns: array of values
      // * Note if more than one column is given an array of arrays is returned
      // **************************************** 
      var ra = [],
          args = sortArgs(arguments);
      run.call(this);
      if (arguments.length === 1) {

        each(this.context().results, function (r) {
          var v = r[args[0]],
              dup = false;
          each(ra, function (d) {
            if (v === d) {
              dup = true;
              return TAFFY.EXIT;
            }
          });
          if (!dup) {
            ra.push(v);
          }
        });
      } else {
        each(this.context().results, function (r) {
          var row = [],
              dup = false;
          each(args, function (c) {
            row.push(r[c]);
          });
          each(ra, function (d) {
            var ldup = true;
            each(args, function (c, i) {
              if (row[i] !== d[i]) {
                ldup = false;
                return TAFFY.EXIT;
              }
            });
            if (ldup) {
              dup = true;
              return TAFFY.EXIT;
            }
          });
          if (!dup) {
            ra.push(row);
          }
        });
      }
      return ra;
    });
    API.extend('supplant', function (template, returnarray) {
      // ****************************************
      // *
      // * Takes: a string template formated with key to be replaced with values from the rows, flag to determine if we want array of strings
      // * Returns: array of values or a string
      // **************************************** 
      var ra = [];
      run.call(this);
      each(this.context().results, function (r) {
        // TODO: The curly braces used to be unescaped
        ra.push(template.replace(/\{([^\{\}]*)\}/g, function (a, b) {
          var v = r[b];
          return typeof v === 'string' || typeof v === 'number' ? v : a;
        }));
      });
      return !returnarray ? ra.join("") : ra;
    });

    API.extend('each', function (m) {
      // ****************************************
      // *
      // * Takes: a function
      // * Purpose: loops over every matching record and applies the function
      // **************************************** 
      run.call(this);
      each(this.context().results, m);
      return this;
    });
    API.extend('map', function (m) {
      // ****************************************
      // *
      // * Takes: a function
      // * Purpose: loops over every matching record and applies the function, returing the results in an array
      // **************************************** 
      var ra = [];
      run.call(this);
      each(this.context().results, function (r) {
        ra.push(m(r));
      });
      return ra;
    });

    T = function (d) {
      // ****************************************
      // *
      // * T is the main TAFFY object
      // * Takes: an array of objects or JSON
      // * Returns a new TAFFYDB
      // **************************************** 
      var TOb = [],
          ID = {},
          RC = 1,
          settings = {
        template: false,
        onInsert: false,
        onUpdate: false,
        onRemove: false,
        onDBChange: false,
        storageName: false,
        forcePropertyCase: null,
        cacheSize: 100,
        name: ''
      },
          dm = new Date(),
          CacheCount = 0,
          CacheClear = 0,
          Cache = {},
          DBI,
          runIndexes,
          root;
      // ****************************************
      // *
      // * TOb = this database
      // * ID = collection of the record IDs and locations within the DB, used for fast lookups
      // * RC = record counter, used for creating IDs
      // * settings.template = the template to merge all new records with
      // * settings.onInsert = event given a copy of the newly inserted record
      // * settings.onUpdate = event given the original record, the changes, and the new record
      // * settings.onRemove = event given the removed record
      // * settings.forcePropertyCase = on insert force the proprty case to be lower or upper. default lower, null/undefined will leave case as is
      // * dm = the modify date of the database, used for query caching
      // **************************************** 


      runIndexes = function (indexes) {
        // ****************************************
        // *
        // * Takes: a collection of indexes
        // * Returns: collection with records matching indexed filters
        // **************************************** 

        var records = [],
            UniqueEnforce = false;

        if (indexes.length === 0) {
          return TOb;
        }

        each(indexes, function (f) {
          // Check to see if record ID
          if (T.isString(f) && /[t][0-9]*[r][0-9]*/i.test(f) && TOb[ID[f]]) {
            records.push(TOb[ID[f]]);
            UniqueEnforce = true;
          }
          // Check to see if record
          if (T.isObject(f) && f.___id && f.___s && TOb[ID[f.___id]]) {
            records.push(TOb[ID[f.___id]]);
            UniqueEnforce = true;
          }
          // Check to see if array of indexes
          if (T.isArray(f)) {
            each(f, function (r) {
              each(runIndexes(r), function (rr) {
                records.push(rr);
              });
            });
          }
        });
        if (UniqueEnforce && records.length > 1) {
          records = [];
        }

        return records;
      };

      DBI = {
        // ****************************************
        // *
        // * The DBI is the internal DataBase Interface that interacts with the data
        // **************************************** 
        dm: function (nd) {
          // ****************************************
          // *
          // * Takes: an optional new modify date
          // * Purpose: used to get and set the DB modify date
          // **************************************** 
          if (nd) {
            dm = nd;
            Cache = {};
            CacheCount = 0;
            CacheClear = 0;
          }
          if (settings.onDBChange) {
            setTimeout(function () {
              settings.onDBChange.call(TOb);
            }, 0);
          }
          if (settings.storageName) {
            setTimeout(function () {
              localStorage.setItem('taffy_' + settings.storageName, JSON.stringify(TOb));
            });
          }
          return dm;
        },
        insert: function (i, runEvent) {
          // ****************************************
          // *
          // * Takes: a new record to insert
          // * Purpose: merge the object with the template, add an ID, insert into DB, call insert event
          // **************************************** 
          var columns = [],
              records = [],
              input = protectJSON(i);
          each(input, function (v, i) {
            var nv, o;
            if (T.isArray(v) && i === 0) {
              each(v, function (av) {

                columns.push(settings.forcePropertyCase === 'lower' ? av.toLowerCase() : settings.forcePropertyCase === 'upper' ? av.toUpperCase() : av);
              });
              return true;
            } else if (T.isArray(v)) {
              nv = {};
              each(v, function (av, ai) {
                nv[columns[ai]] = av;
              });
              v = nv;
            } else if (T.isObject(v) && settings.forcePropertyCase) {
              o = {};

              eachin(v, function (av, ai) {
                o[settings.forcePropertyCase === 'lower' ? ai.toLowerCase() : settings.forcePropertyCase === 'upper' ? ai.toUpperCase() : ai] = v[ai];
              });
              v = o;
            }

            RC++;
            v.___id = 'T' + String(idpad + TC).slice(-6) + 'R' + String(idpad + RC).slice(-6);
            v.___s = true;
            records.push(v.___id);
            if (settings.template) {
              v = T.mergeObj(settings.template, v);
            }
            TOb.push(v);

            ID[v.___id] = TOb.length - 1;
            if (settings.onInsert && (runEvent || TAFFY.isUndefined(runEvent))) {
              settings.onInsert.call(v);
            }
            DBI.dm(new Date());
          });
          return root(records);
        },
        sort: function (o) {
          // ****************************************
          // *
          // * Purpose: Change the sort order of the DB itself and reset the ID bucket
          // **************************************** 
          TOb = orderByCol(TOb, o.split(','));
          ID = {};
          each(TOb, function (r, i) {
            ID[r.___id] = i;
          });
          DBI.dm(new Date());
          return true;
        },
        update: function (id, changes, runEvent) {
          // ****************************************
          // *
          // * Takes: the ID of record being changed and the changes
          // * Purpose: Update a record and change some or all values, call the on update method
          // ****************************************

          var nc = {},
              or,
              nr,
              tc,
              hasChange;
          if (settings.forcePropertyCase) {
            eachin(changes, function (v, p) {
              nc[settings.forcePropertyCase === 'lower' ? p.toLowerCase() : settings.forcePropertyCase === 'upper' ? p.toUpperCase() : p] = v;
            });
            changes = nc;
          }

          or = TOb[ID[id]];
          nr = T.mergeObj(or, changes);

          tc = {};
          hasChange = false;
          eachin(nr, function (v, i) {
            if (TAFFY.isUndefined(or[i]) || or[i] !== v) {
              tc[i] = v;
              hasChange = true;
            }
          });
          if (hasChange) {
            if (settings.onUpdate && (runEvent || TAFFY.isUndefined(runEvent))) {
              settings.onUpdate.call(nr, TOb[ID[id]], tc);
            }
            TOb[ID[id]] = nr;
            DBI.dm(new Date());
          }
        },
        remove: function (id) {
          // ****************************************
          // *
          // * Takes: the ID of record to be removed
          // * Purpose: remove a record, changes its ___s value to false
          // **************************************** 
          TOb[ID[id]].___s = false;
        },
        removeCommit: function (runEvent) {
          var x;
          // ****************************************
          // *
          // * 
          // * Purpose: loop over all records and remove records with ___s = false, call onRemove event, clear ID
          // ****************************************
          for (x = TOb.length - 1; x > -1; x--) {

            if (!TOb[x].___s) {
              if (settings.onRemove && (runEvent || TAFFY.isUndefined(runEvent))) {
                settings.onRemove.call(TOb[x]);
              }
              ID[TOb[x].___id] = undefined;
              TOb.splice(x, 1);
            }
          }
          ID = {};
          each(TOb, function (r, i) {
            ID[r.___id] = i;
          });
          DBI.dm(new Date());
        },
        query: function (context) {
          // ****************************************
          // *
          // * Takes: the context object for a query and either returns a cache result or a new query result
          // **************************************** 
          var returnq, cid, results, indexed, limitq, ni;

          if (settings.cacheSize) {
            cid = '';
            each(context.filterRaw, function (r) {
              if (T.isFunction(r)) {
                cid = 'nocache';
                return TAFFY.EXIT;
              }
            });
            if (cid === '') {
              cid = makeCid(T.mergeObj(context, { q: false, run: false, sort: false }));
            }
          }
          // Run a new query if there are no results or the run date has been cleared
          if (!context.results || !context.run || context.run && DBI.dm() > context.run) {
            results = [];

            // check Cache

            if (settings.cacheSize && Cache[cid]) {

              Cache[cid].i = CacheCount++;
              return Cache[cid].results;
            } else {
              // if no filter, return DB
              if (context.q.length === 0 && context.index.length === 0) {
                each(TOb, function (r) {
                  results.push(r);
                });
                returnq = results;
              } else {
                // use indexes

                indexed = runIndexes(context.index);

                // run filters
                each(indexed, function (r) {
                  // Run filter to see if record matches query
                  if (context.q.length === 0 || runFilters(r, context.q)) {
                    results.push(r);
                  }
                });

                returnq = results;
              }
            }
          } else {
            // If query exists and run has not been cleared return the cache results
            returnq = context.results;
          }
          // If a custom order array exists and the run has been clear or the sort has been cleared
          if (context.order.length > 0 && (!context.run || !context.sort)) {
            // order the results
            returnq = orderByCol(returnq, context.order);
          }

          // If a limit on the number of results exists and it is less than the returned results, limit results
          if (returnq.length && (context.limit && context.limit < returnq.length || context.start)) {
            limitq = [];
            each(returnq, function (r, i) {
              if (!context.start || context.start && i + 1 >= context.start) {
                if (context.limit) {
                  ni = context.start ? i + 1 - context.start : i;
                  if (ni < context.limit) {
                    limitq.push(r);
                  } else if (ni > context.limit) {
                    return TAFFY.EXIT;
                  }
                } else {
                  limitq.push(r);
                }
              }
            });
            returnq = limitq;
          }

          // update cache
          if (settings.cacheSize && cid !== 'nocache') {
            CacheClear++;

            setTimeout(function () {
              var bCounter, nc;
              if (CacheClear >= settings.cacheSize * 2) {
                CacheClear = 0;
                bCounter = CacheCount - settings.cacheSize;
                nc = {};
                eachin(function (r, k) {
                  if (r.i >= bCounter) {
                    nc[k] = r;
                  }
                });
                Cache = nc;
              }
            }, 0);

            Cache[cid] = { i: CacheCount++, results: returnq };
          }
          return returnq;
        }
      };

      root = function () {
        var iAPI, context;
        // ****************************************
        // *
        // * The root function that gets returned when a new DB is created
        // * Takes: unlimited filter arguments and creates filters to be run when a query is called
        // **************************************** 
        // ****************************************
        // *
        // * iAPI is the the method collection valiable when a query has been started by calling dbname
        // * Certain methods are or are not avaliable once you have started a query such as insert -- you can only insert into root
        // ****************************************
        iAPI = TAFFY.mergeObj(TAFFY.mergeObj(API, { insert: undefined }), { getDBI: function () {
            return DBI;
          },
          getroot: function (c) {
            return root.call(c);
          },
          context: function (n) {
            // ****************************************
            // *
            // * The context contains all the information to manage a query including filters, limits, and sorts
            // **************************************** 
            if (n) {
              context = TAFFY.mergeObj(context, n.hasOwnProperty('results') ? TAFFY.mergeObj(n, { run: new Date(), sort: new Date() }) : n);
            }
            return context;
          },
          extend: undefined
        });

        context = this && this.q ? this : {
          limit: false,
          start: false,
          q: [],
          filterRaw: [],
          index: [],
          order: [],
          results: false,
          run: null,
          sort: null,
          settings: settings
        };
        // ****************************************
        // *
        // * Call the query method to setup a new query
        // **************************************** 
        each(sortArgs(arguments), function (f) {

          if (isIndexable(f)) {
            context.index.push(f);
          } else {
            context.q.push(returnFilter(f));
          }
          context.filterRaw.push(f);
        });

        return iAPI;
      };

      // ****************************************
      // *
      // * If new records have been passed on creation of the DB either as JSON or as an array/object, insert them
      // **************************************** 
      TC++;
      if (d) {
        DBI.insert(d);
      }

      root.insert = DBI.insert;

      root.merge = function (i, key, runEvent) {
        var search = {},
            finalSearch = [],
            obj = {};

        runEvent = runEvent || false;
        key = key || 'id';

        each(i, function (o) {
          var existingObject;
          search[key] = o[key];
          finalSearch.push(o[key]);
          existingObject = root(search).first();
          if (existingObject) {
            DBI.update(existingObject.___id, o, runEvent);
          } else {
            DBI.insert(o, runEvent);
          }
        });

        obj[key] = finalSearch;
        return root(obj);
      };

      root.TAFFY = true;
      root.sort = DBI.sort;
      // ****************************************
      // *
      // * These are the methods that can be accessed on off the root DB function. Example dbname.insert;
      // **************************************** 
      root.settings = function (n) {
        // ****************************************
        // *
        // * Getting and setting for this DB's settings/events
        // **************************************** 
        if (n) {
          settings = TAFFY.mergeObj(settings, n);
          if (n.template) {

            root().update(n.template);
          }
        }
        return settings;
      };

      // ****************************************
      // *
      // * These are the methods that can be accessed on off the root DB function. Example dbname.insert;
      // **************************************** 
      root.store = function (n) {
        // ****************************************
        // *
        // * Setup localstorage for this DB on a given name
        // * Pull data into the DB as needed
        // **************************************** 
        var r = false,
            i;
        if (localStorage) {
          if (n) {
            i = localStorage.getItem('taffy_' + n);
            if (i && i.length > 0) {
              root.insert(i);
              r = true;
            }
            if (TOb.length > 0) {
              setTimeout(function () {
                localStorage.setItem('taffy_' + settings.storageName, JSON.stringify(TOb));
              });
            }
          }
          root.settings({ storageName: n });
        }
        return root;
      };

      // ****************************************
      // *
      // * Return root on DB creation and start having fun
      // **************************************** 
      return root;
    };
    // ****************************************
    // *
    // * Sets the global TAFFY object
    // **************************************** 
    TAFFY = T;

    // ****************************************
    // *
    // * Create public each method
    // *
    // ****************************************   
    T.each = each;

    // ****************************************
    // *
    // * Create public eachin method
    // *
    // ****************************************   
    T.eachin = eachin;
    // ****************************************
    // *
    // * Create public extend method
    // * Add a custom method to the API
    // *
    // ****************************************   
    T.extend = API.extend;

    // ****************************************
    // *
    // * Creates TAFFY.EXIT value that can be returned to stop an each loop
    // *
    // ****************************************  
    TAFFY.EXIT = 'TAFFYEXIT';

    // ****************************************
    // *
    // * Create public utility mergeObj method
    // * Return a new object where items from obj2
    // * have replaced or been added to the items in
    // * obj1
    // * Purpose: Used to combine objs
    // *
    // ****************************************   
    TAFFY.mergeObj = function (ob1, ob2) {
      var c = {};
      eachin(ob1, function (v, n) {
        c[n] = ob1[n];
      });
      eachin(ob2, function (v, n) {
        c[n] = ob2[n];
      });
      return c;
    };

    // ****************************************
    // *
    // * Create public utility has method
    // * Returns true if a complex object, array
    // * or taffy collection contains the material
    // * provided in the second argument
    // * Purpose: Used to comare objects
    // *
    // ****************************************
    TAFFY.has = function (var1, var2) {

      var re = false,
          n;

      if (var1.TAFFY) {
        re = var1(var2);
        if (re.length > 0) {
          return true;
        } else {
          return false;
        }
      } else {

        switch (T.typeOf(var1)) {
          case 'object':
            if (T.isObject(var2)) {
              eachin(var2, function (v, n) {
                if (re === true && !T.isUndefined(var1[n]) && var1.hasOwnProperty(n)) {
                  re = T.has(var1[n], var2[n]);
                } else {
                  re = false;
                  return TAFFY.EXIT;
                }
              });
            } else if (T.isArray(var2)) {
              each(var2, function (v, n) {
                re = T.has(var1, var2[n]);
                if (re) {
                  return TAFFY.EXIT;
                }
              });
            } else if (T.isString(var2)) {
              if (!TAFFY.isUndefined(var1[var2])) {
                return true;
              } else {
                return false;
              }
            }
            return re;
          case 'array':
            if (T.isObject(var2)) {
              each(var1, function (v, i) {
                re = T.has(var1[i], var2);
                if (re === true) {
                  return TAFFY.EXIT;
                }
              });
            } else if (T.isArray(var2)) {
              each(var2, function (v2, i2) {
                each(var1, function (v1, i1) {
                  re = T.has(var1[i1], var2[i2]);
                  if (re === true) {
                    return TAFFY.EXIT;
                  }
                });
                if (re === true) {
                  return TAFFY.EXIT;
                }
              });
            } else if (T.isString(var2) || T.isNumber(var2)) {
              re = false;
              for (n = 0; n < var1.length; n++) {
                re = T.has(var1[n], var2);
                if (re) {
                  return true;
                }
              }
            }
            return re;
          case 'string':
            if (T.isString(var2) && var2 === var1) {
              return true;
            }
            break;
          default:
            if (T.typeOf(var1) === T.typeOf(var2) && var1 === var2) {
              return true;
            }
            break;
        }
      }
      return false;
    };

    // ****************************************
    // *
    // * Create public utility hasAll method
    // * Returns true if a complex object, array
    // * or taffy collection contains the material
    // * provided in the call - for arrays it must
    // * contain all the material in each array item
    // * Purpose: Used to comare objects
    // *
    // ****************************************
    TAFFY.hasAll = function (var1, var2) {

      var T = TAFFY,
          ar;
      if (T.isArray(var2)) {
        ar = true;
        each(var2, function (v) {
          ar = T.has(var1, v);
          if (ar === false) {
            return TAFFY.EXIT;
          }
        });
        return ar;
      } else {
        return T.has(var1, var2);
      }
    };

    // ****************************************
    // *
    // * typeOf Fixed in JavaScript as public utility
    // *
    // ****************************************
    TAFFY.typeOf = function (v) {
      var s = typeof v;
      if (s === 'object') {
        if (v) {
          if (typeof v.length === 'number' && !v.propertyIsEnumerable('length')) {
            s = 'array';
          }
        } else {
          s = 'null';
        }
      }
      return s;
    };

    // ****************************************
    // *
    // * Create public utility getObjectKeys method
    // * Returns an array of an objects keys
    // * Purpose: Used to get the keys for an object
    // *
    // ****************************************   
    TAFFY.getObjectKeys = function (ob) {
      var kA = [];
      eachin(ob, function (n, h) {
        kA.push(h);
      });
      kA.sort();
      return kA;
    };

    // ****************************************
    // *
    // * Create public utility isSameArray
    // * Returns an array of an objects keys
    // * Purpose: Used to get the keys for an object
    // *
    // ****************************************   
    TAFFY.isSameArray = function (ar1, ar2) {
      return TAFFY.isArray(ar1) && TAFFY.isArray(ar2) && ar1.join(',') === ar2.join(',') ? true : false;
    };

    // ****************************************
    // *
    // * Create public utility isSameObject method
    // * Returns true if objects contain the same
    // * material or false if they do not
    // * Purpose: Used to comare objects
    // *
    // ****************************************   
    TAFFY.isSameObject = function (ob1, ob2) {
      var T = TAFFY,
          rv = true;

      if (T.isObject(ob1) && T.isObject(ob2)) {
        if (T.isSameArray(T.getObjectKeys(ob1), T.getObjectKeys(ob2))) {
          eachin(ob1, function (v, n) {
            if (!(T.isObject(ob1[n]) && T.isObject(ob2[n]) && T.isSameObject(ob1[n], ob2[n]) || T.isArray(ob1[n]) && T.isArray(ob2[n]) && T.isSameArray(ob1[n], ob2[n]) || ob1[n] === ob2[n])) {
              rv = false;
              return TAFFY.EXIT;
            }
          });
        } else {
          rv = false;
        }
      } else {
        rv = false;
      }
      return rv;
    };

    // ****************************************
    // *
    // * Create public utility is[DataType] methods
    // * Return true if obj is datatype, false otherwise
    // * Purpose: Used to determine if arguments are of certain data type
    // *
    // * mmikowski 2012-08-06 refactored to make much less "magical":
    // *   fewer closures and passes jslint
    // *
    // ****************************************

    typeList = ['String', 'Number', 'Object', 'Array', 'Boolean', 'Null', 'Function', 'Undefined'];

    makeTest = function (thisKey) {
      return function (data) {
        return TAFFY.typeOf(data) === thisKey.toLowerCase() ? true : false;
      };
    };

    for (idx = 0; idx < typeList.length; idx++) {
      typeKey = typeList[idx];
      TAFFY['is' + typeKey] = makeTest(typeKey);
    }
  }
})();

if (typeof exports === 'object') {
  exports.taffy = TAFFY;
}
/*! jQuery v2.2.4 | (c) jQuery Foundation | jquery.org/license */
!function (a, b) {
  "object" == typeof module && "object" == typeof module.exports ? module.exports = a.document ? b(a, !0) : function (a) {
    if (!a.document) throw new Error("jQuery requires a window with a document");return b(a);
  } : b(a);
}("undefined" != typeof window ? window : this, function (a, b) {
  var c = [],
      d = a.document,
      e = c.slice,
      f = c.concat,
      g = c.push,
      h = c.indexOf,
      i = {},
      j = i.toString,
      k = i.hasOwnProperty,
      l = {},
      m = "2.2.4",
      n = function (a, b) {
    return new n.fn.init(a, b);
  },
      o = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
      p = /^-ms-/,
      q = /-([\da-z])/gi,
      r = function (a, b) {
    return b.toUpperCase();
  };n.fn = n.prototype = { jquery: m, constructor: n, selector: "", length: 0, toArray: function () {
      return e.call(this);
    }, get: function (a) {
      return null != a ? 0 > a ? this[a + this.length] : this[a] : e.call(this);
    }, pushStack: function (a) {
      var b = n.merge(this.constructor(), a);return b.prevObject = this, b.context = this.context, b;
    }, each: function (a) {
      return n.each(this, a);
    }, map: function (a) {
      return this.pushStack(n.map(this, function (b, c) {
        return a.call(b, c, b);
      }));
    }, slice: function () {
      return this.pushStack(e.apply(this, arguments));
    }, first: function () {
      return this.eq(0);
    }, last: function () {
      return this.eq(-1);
    }, eq: function (a) {
      var b = this.length,
          c = +a + (0 > a ? b : 0);return this.pushStack(c >= 0 && b > c ? [this[c]] : []);
    }, end: function () {
      return this.prevObject || this.constructor();
    }, push: g, sort: c.sort, splice: c.splice }, n.extend = n.fn.extend = function () {
    var a,
        b,
        c,
        d,
        e,
        f,
        g = arguments[0] || {},
        h = 1,
        i = arguments.length,
        j = !1;for ("boolean" == typeof g && (j = g, g = arguments[h] || {}, h++), "object" == typeof g || n.isFunction(g) || (g = {}), h === i && (g = this, h--); i > h; h++) {
      if (null != (a = arguments[h])) for (b in a) {
        c = g[b], d = a[b], g !== d && (j && d && (n.isPlainObject(d) || (e = n.isArray(d))) ? (e ? (e = !1, f = c && n.isArray(c) ? c : []) : f = c && n.isPlainObject(c) ? c : {}, g[b] = n.extend(j, f, d)) : void 0 !== d && (g[b] = d));
      }
    }return g;
  }, n.extend({ expando: "jQuery" + (m + Math.random()).replace(/\D/g, ""), isReady: !0, error: function (a) {
      throw new Error(a);
    }, noop: function () {}, isFunction: function (a) {
      return "function" === n.type(a);
    }, isArray: Array.isArray, isWindow: function (a) {
      return null != a && a === a.window;
    }, isNumeric: function (a) {
      var b = a && a.toString();return !n.isArray(a) && b - parseFloat(b) + 1 >= 0;
    }, isPlainObject: function (a) {
      var b;if ("object" !== n.type(a) || a.nodeType || n.isWindow(a)) return !1;if (a.constructor && !k.call(a, "constructor") && !k.call(a.constructor.prototype || {}, "isPrototypeOf")) return !1;for (b in a) {}return void 0 === b || k.call(a, b);
    }, isEmptyObject: function (a) {
      var b;for (b in a) {
        return !1;
      }return !0;
    }, type: function (a) {
      return null == a ? a + "" : "object" == typeof a || "function" == typeof a ? i[j.call(a)] || "object" : typeof a;
    }, globalEval: function (a) {
      var b,
          c = eval;a = n.trim(a), a && (1 === a.indexOf("use strict") ? (b = d.createElement("script"), b.text = a, d.head.appendChild(b).parentNode.removeChild(b)) : c(a));
    }, camelCase: function (a) {
      return a.replace(p, "ms-").replace(q, r);
    }, nodeName: function (a, b) {
      return a.nodeName && a.nodeName.toLowerCase() === b.toLowerCase();
    }, each: function (a, b) {
      var c,
          d = 0;if (s(a)) {
        for (c = a.length; c > d; d++) {
          if (b.call(a[d], d, a[d]) === !1) break;
        }
      } else for (d in a) {
        if (b.call(a[d], d, a[d]) === !1) break;
      }return a;
    }, trim: function (a) {
      return null == a ? "" : (a + "").replace(o, "");
    }, makeArray: function (a, b) {
      var c = b || [];return null != a && (s(Object(a)) ? n.merge(c, "string" == typeof a ? [a] : a) : g.call(c, a)), c;
    }, inArray: function (a, b, c) {
      return null == b ? -1 : h.call(b, a, c);
    }, merge: function (a, b) {
      for (var c = +b.length, d = 0, e = a.length; c > d; d++) {
        a[e++] = b[d];
      }return a.length = e, a;
    }, grep: function (a, b, c) {
      for (var d, e = [], f = 0, g = a.length, h = !c; g > f; f++) {
        d = !b(a[f], f), d !== h && e.push(a[f]);
      }return e;
    }, map: function (a, b, c) {
      var d,
          e,
          g = 0,
          h = [];if (s(a)) for (d = a.length; d > g; g++) {
        e = b(a[g], g, c), null != e && h.push(e);
      } else for (g in a) {
        e = b(a[g], g, c), null != e && h.push(e);
      }return f.apply([], h);
    }, guid: 1, proxy: function (a, b) {
      var c, d, f;return "string" == typeof b && (c = a[b], b = a, a = c), n.isFunction(a) ? (d = e.call(arguments, 2), f = function () {
        return a.apply(b || this, d.concat(e.call(arguments)));
      }, f.guid = a.guid = a.guid || n.guid++, f) : void 0;
    }, now: Date.now, support: l }), "function" == typeof Symbol && (n.fn[Symbol.iterator] = c[Symbol.iterator]), n.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function (a, b) {
    i["[object " + b + "]"] = b.toLowerCase();
  });function s(a) {
    var b = !!a && "length" in a && a.length,
        c = n.type(a);return "function" === c || n.isWindow(a) ? !1 : "array" === c || 0 === b || "number" == typeof b && b > 0 && b - 1 in a;
  }var t = function (a) {
    var b,
        c,
        d,
        e,
        f,
        g,
        h,
        i,
        j,
        k,
        l,
        m,
        n,
        o,
        p,
        q,
        r,
        s,
        t,
        u = "sizzle" + 1 * new Date(),
        v = a.document,
        w = 0,
        x = 0,
        y = ga(),
        z = ga(),
        A = ga(),
        B = function (a, b) {
      return a === b && (l = !0), 0;
    },
        C = 1 << 31,
        D = {}.hasOwnProperty,
        E = [],
        F = E.pop,
        G = E.push,
        H = E.push,
        I = E.slice,
        J = function (a, b) {
      for (var c = 0, d = a.length; d > c; c++) {
        if (a[c] === b) return c;
      }return -1;
    },
        K = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        L = "[\\x20\\t\\r\\n\\f]",
        M = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
        N = "\\[" + L + "*(" + M + ")(?:" + L + "*([*^$|!~]?=)" + L + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + M + "))|)" + L + "*\\]",
        O = ":(" + M + ")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|" + N + ")*)|.*)\\)|)",
        P = new RegExp(L + "+", "g"),
        Q = new RegExp("^" + L + "+|((?:^|[^\\\\])(?:\\\\.)*)" + L + "+$", "g"),
        R = new RegExp("^" + L + "*," + L + "*"),
        S = new RegExp("^" + L + "*([>+~]|" + L + ")" + L + "*"),
        T = new RegExp("=" + L + "*([^\\]'\"]*?)" + L + "*\\]", "g"),
        U = new RegExp(O),
        V = new RegExp("^" + M + "$"),
        W = { ID: new RegExp("^#(" + M + ")"), CLASS: new RegExp("^\\.(" + M + ")"), TAG: new RegExp("^(" + M + "|[*])"), ATTR: new RegExp("^" + N), PSEUDO: new RegExp("^" + O), CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + L + "*(even|odd|(([+-]|)(\\d*)n|)" + L + "*(?:([+-]|)" + L + "*(\\d+)|))" + L + "*\\)|)", "i"), bool: new RegExp("^(?:" + K + ")$", "i"), needsContext: new RegExp("^" + L + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + L + "*((?:-\\d)?\\d*)" + L + "*\\)|)(?=[^-]|$)", "i") },
        X = /^(?:input|select|textarea|button)$/i,
        Y = /^h\d$/i,
        Z = /^[^{]+\{\s*\[native \w/,
        $ = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        _ = /[+~]/,
        aa = /'|\\/g,
        ba = new RegExp("\\\\([\\da-f]{1,6}" + L + "?|(" + L + ")|.)", "ig"),
        ca = function (a, b, c) {
      var d = "0x" + b - 65536;return d !== d || c ? b : 0 > d ? String.fromCharCode(d + 65536) : String.fromCharCode(d >> 10 | 55296, 1023 & d | 56320);
    },
        da = function () {
      m();
    };try {
      H.apply(E = I.call(v.childNodes), v.childNodes), E[v.childNodes.length].nodeType;
    } catch (ea) {
      H = { apply: E.length ? function (a, b) {
          G.apply(a, I.call(b));
        } : function (a, b) {
          var c = a.length,
              d = 0;while (a[c++] = b[d++]) {}a.length = c - 1;
        } };
    }function fa(a, b, d, e) {
      var f,
          h,
          j,
          k,
          l,
          o,
          r,
          s,
          w = b && b.ownerDocument,
          x = b ? b.nodeType : 9;if (d = d || [], "string" != typeof a || !a || 1 !== x && 9 !== x && 11 !== x) return d;if (!e && ((b ? b.ownerDocument || b : v) !== n && m(b), b = b || n, p)) {
        if (11 !== x && (o = $.exec(a))) if (f = o[1]) {
          if (9 === x) {
            if (!(j = b.getElementById(f))) return d;if (j.id === f) return d.push(j), d;
          } else if (w && (j = w.getElementById(f)) && t(b, j) && j.id === f) return d.push(j), d;
        } else {
          if (o[2]) return H.apply(d, b.getElementsByTagName(a)), d;if ((f = o[3]) && c.getElementsByClassName && b.getElementsByClassName) return H.apply(d, b.getElementsByClassName(f)), d;
        }if (c.qsa && !A[a + " "] && (!q || !q.test(a))) {
          if (1 !== x) w = b, s = a;else if ("object" !== b.nodeName.toLowerCase()) {
            (k = b.getAttribute("id")) ? k = k.replace(aa, "\\$&") : b.setAttribute("id", k = u), r = g(a), h = r.length, l = V.test(k) ? "#" + k : "[id='" + k + "']";while (h--) {
              r[h] = l + " " + qa(r[h]);
            }s = r.join(","), w = _.test(a) && oa(b.parentNode) || b;
          }if (s) try {
            return H.apply(d, w.querySelectorAll(s)), d;
          } catch (y) {} finally {
            k === u && b.removeAttribute("id");
          }
        }
      }return i(a.replace(Q, "$1"), b, d, e);
    }function ga() {
      var a = [];function b(c, e) {
        return a.push(c + " ") > d.cacheLength && delete b[a.shift()], b[c + " "] = e;
      }return b;
    }function ha(a) {
      return a[u] = !0, a;
    }function ia(a) {
      var b = n.createElement("div");try {
        return !!a(b);
      } catch (c) {
        return !1;
      } finally {
        b.parentNode && b.parentNode.removeChild(b), b = null;
      }
    }function ja(a, b) {
      var c = a.split("|"),
          e = c.length;while (e--) {
        d.attrHandle[c[e]] = b;
      }
    }function ka(a, b) {
      var c = b && a,
          d = c && 1 === a.nodeType && 1 === b.nodeType && (~b.sourceIndex || C) - (~a.sourceIndex || C);if (d) return d;if (c) while (c = c.nextSibling) {
        if (c === b) return -1;
      }return a ? 1 : -1;
    }function la(a) {
      return function (b) {
        var c = b.nodeName.toLowerCase();return "input" === c && b.type === a;
      };
    }function ma(a) {
      return function (b) {
        var c = b.nodeName.toLowerCase();return ("input" === c || "button" === c) && b.type === a;
      };
    }function na(a) {
      return ha(function (b) {
        return b = +b, ha(function (c, d) {
          var e,
              f = a([], c.length, b),
              g = f.length;while (g--) {
            c[e = f[g]] && (c[e] = !(d[e] = c[e]));
          }
        });
      });
    }function oa(a) {
      return a && "undefined" != typeof a.getElementsByTagName && a;
    }c = fa.support = {}, f = fa.isXML = function (a) {
      var b = a && (a.ownerDocument || a).documentElement;return b ? "HTML" !== b.nodeName : !1;
    }, m = fa.setDocument = function (a) {
      var b,
          e,
          g = a ? a.ownerDocument || a : v;return g !== n && 9 === g.nodeType && g.documentElement ? (n = g, o = n.documentElement, p = !f(n), (e = n.defaultView) && e.top !== e && (e.addEventListener ? e.addEventListener("unload", da, !1) : e.attachEvent && e.attachEvent("onunload", da)), c.attributes = ia(function (a) {
        return a.className = "i", !a.getAttribute("className");
      }), c.getElementsByTagName = ia(function (a) {
        return a.appendChild(n.createComment("")), !a.getElementsByTagName("*").length;
      }), c.getElementsByClassName = Z.test(n.getElementsByClassName), c.getById = ia(function (a) {
        return o.appendChild(a).id = u, !n.getElementsByName || !n.getElementsByName(u).length;
      }), c.getById ? (d.find.ID = function (a, b) {
        if ("undefined" != typeof b.getElementById && p) {
          var c = b.getElementById(a);return c ? [c] : [];
        }
      }, d.filter.ID = function (a) {
        var b = a.replace(ba, ca);return function (a) {
          return a.getAttribute("id") === b;
        };
      }) : (delete d.find.ID, d.filter.ID = function (a) {
        var b = a.replace(ba, ca);return function (a) {
          var c = "undefined" != typeof a.getAttributeNode && a.getAttributeNode("id");return c && c.value === b;
        };
      }), d.find.TAG = c.getElementsByTagName ? function (a, b) {
        return "undefined" != typeof b.getElementsByTagName ? b.getElementsByTagName(a) : c.qsa ? b.querySelectorAll(a) : void 0;
      } : function (a, b) {
        var c,
            d = [],
            e = 0,
            f = b.getElementsByTagName(a);if ("*" === a) {
          while (c = f[e++]) {
            1 === c.nodeType && d.push(c);
          }return d;
        }return f;
      }, d.find.CLASS = c.getElementsByClassName && function (a, b) {
        return "undefined" != typeof b.getElementsByClassName && p ? b.getElementsByClassName(a) : void 0;
      }, r = [], q = [], (c.qsa = Z.test(n.querySelectorAll)) && (ia(function (a) {
        o.appendChild(a).innerHTML = "<a id='" + u + "'></a><select id='" + u + "-\r\\' msallowcapture=''><option selected=''></option></select>", a.querySelectorAll("[msallowcapture^='']").length && q.push("[*^$]=" + L + "*(?:''|\"\")"), a.querySelectorAll("[selected]").length || q.push("\\[" + L + "*(?:value|" + K + ")"), a.querySelectorAll("[id~=" + u + "-]").length || q.push("~="), a.querySelectorAll(":checked").length || q.push(":checked"), a.querySelectorAll("a#" + u + "+*").length || q.push(".#.+[+~]");
      }), ia(function (a) {
        var b = n.createElement("input");b.setAttribute("type", "hidden"), a.appendChild(b).setAttribute("name", "D"), a.querySelectorAll("[name=d]").length && q.push("name" + L + "*[*^$|!~]?="), a.querySelectorAll(":enabled").length || q.push(":enabled", ":disabled"), a.querySelectorAll("*,:x"), q.push(",.*:");
      })), (c.matchesSelector = Z.test(s = o.matches || o.webkitMatchesSelector || o.mozMatchesSelector || o.oMatchesSelector || o.msMatchesSelector)) && ia(function (a) {
        c.disconnectedMatch = s.call(a, "div"), s.call(a, "[s!='']:x"), r.push("!=", O);
      }), q = q.length && new RegExp(q.join("|")), r = r.length && new RegExp(r.join("|")), b = Z.test(o.compareDocumentPosition), t = b || Z.test(o.contains) ? function (a, b) {
        var c = 9 === a.nodeType ? a.documentElement : a,
            d = b && b.parentNode;return a === d || !(!d || 1 !== d.nodeType || !(c.contains ? c.contains(d) : a.compareDocumentPosition && 16 & a.compareDocumentPosition(d)));
      } : function (a, b) {
        if (b) while (b = b.parentNode) {
          if (b === a) return !0;
        }return !1;
      }, B = b ? function (a, b) {
        if (a === b) return l = !0, 0;var d = !a.compareDocumentPosition - !b.compareDocumentPosition;return d ? d : (d = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1, 1 & d || !c.sortDetached && b.compareDocumentPosition(a) === d ? a === n || a.ownerDocument === v && t(v, a) ? -1 : b === n || b.ownerDocument === v && t(v, b) ? 1 : k ? J(k, a) - J(k, b) : 0 : 4 & d ? -1 : 1);
      } : function (a, b) {
        if (a === b) return l = !0, 0;var c,
            d = 0,
            e = a.parentNode,
            f = b.parentNode,
            g = [a],
            h = [b];if (!e || !f) return a === n ? -1 : b === n ? 1 : e ? -1 : f ? 1 : k ? J(k, a) - J(k, b) : 0;if (e === f) return ka(a, b);c = a;while (c = c.parentNode) {
          g.unshift(c);
        }c = b;while (c = c.parentNode) {
          h.unshift(c);
        }while (g[d] === h[d]) {
          d++;
        }return d ? ka(g[d], h[d]) : g[d] === v ? -1 : h[d] === v ? 1 : 0;
      }, n) : n;
    }, fa.matches = function (a, b) {
      return fa(a, null, null, b);
    }, fa.matchesSelector = function (a, b) {
      if ((a.ownerDocument || a) !== n && m(a), b = b.replace(T, "='$1']"), c.matchesSelector && p && !A[b + " "] && (!r || !r.test(b)) && (!q || !q.test(b))) try {
        var d = s.call(a, b);if (d || c.disconnectedMatch || a.document && 11 !== a.document.nodeType) return d;
      } catch (e) {}return fa(b, n, null, [a]).length > 0;
    }, fa.contains = function (a, b) {
      return (a.ownerDocument || a) !== n && m(a), t(a, b);
    }, fa.attr = function (a, b) {
      (a.ownerDocument || a) !== n && m(a);var e = d.attrHandle[b.toLowerCase()],
          f = e && D.call(d.attrHandle, b.toLowerCase()) ? e(a, b, !p) : void 0;return void 0 !== f ? f : c.attributes || !p ? a.getAttribute(b) : (f = a.getAttributeNode(b)) && f.specified ? f.value : null;
    }, fa.error = function (a) {
      throw new Error("Syntax error, unrecognized expression: " + a);
    }, fa.uniqueSort = function (a) {
      var b,
          d = [],
          e = 0,
          f = 0;if (l = !c.detectDuplicates, k = !c.sortStable && a.slice(0), a.sort(B), l) {
        while (b = a[f++]) {
          b === a[f] && (e = d.push(f));
        }while (e--) {
          a.splice(d[e], 1);
        }
      }return k = null, a;
    }, e = fa.getText = function (a) {
      var b,
          c = "",
          d = 0,
          f = a.nodeType;if (f) {
        if (1 === f || 9 === f || 11 === f) {
          if ("string" == typeof a.textContent) return a.textContent;for (a = a.firstChild; a; a = a.nextSibling) {
            c += e(a);
          }
        } else if (3 === f || 4 === f) return a.nodeValue;
      } else while (b = a[d++]) {
        c += e(b);
      }return c;
    }, d = fa.selectors = { cacheLength: 50, createPseudo: ha, match: W, attrHandle: {}, find: {}, relative: { ">": { dir: "parentNode", first: !0 }, " ": { dir: "parentNode" }, "+": { dir: "previousSibling", first: !0 }, "~": { dir: "previousSibling" } }, preFilter: { ATTR: function (a) {
          return a[1] = a[1].replace(ba, ca), a[3] = (a[3] || a[4] || a[5] || "").replace(ba, ca), "~=" === a[2] && (a[3] = " " + a[3] + " "), a.slice(0, 4);
        }, CHILD: function (a) {
          return a[1] = a[1].toLowerCase(), "nth" === a[1].slice(0, 3) ? (a[3] || fa.error(a[0]), a[4] = +(a[4] ? a[5] + (a[6] || 1) : 2 * ("even" === a[3] || "odd" === a[3])), a[5] = +(a[7] + a[8] || "odd" === a[3])) : a[3] && fa.error(a[0]), a;
        }, PSEUDO: function (a) {
          var b,
              c = !a[6] && a[2];return W.CHILD.test(a[0]) ? null : (a[3] ? a[2] = a[4] || a[5] || "" : c && U.test(c) && (b = g(c, !0)) && (b = c.indexOf(")", c.length - b) - c.length) && (a[0] = a[0].slice(0, b), a[2] = c.slice(0, b)), a.slice(0, 3));
        } }, filter: { TAG: function (a) {
          var b = a.replace(ba, ca).toLowerCase();return "*" === a ? function () {
            return !0;
          } : function (a) {
            return a.nodeName && a.nodeName.toLowerCase() === b;
          };
        }, CLASS: function (a) {
          var b = y[a + " "];return b || (b = new RegExp("(^|" + L + ")" + a + "(" + L + "|$)")) && y(a, function (a) {
            return b.test("string" == typeof a.className && a.className || "undefined" != typeof a.getAttribute && a.getAttribute("class") || "");
          });
        }, ATTR: function (a, b, c) {
          return function (d) {
            var e = fa.attr(d, a);return null == e ? "!=" === b : b ? (e += "", "=" === b ? e === c : "!=" === b ? e !== c : "^=" === b ? c && 0 === e.indexOf(c) : "*=" === b ? c && e.indexOf(c) > -1 : "$=" === b ? c && e.slice(-c.length) === c : "~=" === b ? (" " + e.replace(P, " ") + " ").indexOf(c) > -1 : "|=" === b ? e === c || e.slice(0, c.length + 1) === c + "-" : !1) : !0;
          };
        }, CHILD: function (a, b, c, d, e) {
          var f = "nth" !== a.slice(0, 3),
              g = "last" !== a.slice(-4),
              h = "of-type" === b;return 1 === d && 0 === e ? function (a) {
            return !!a.parentNode;
          } : function (b, c, i) {
            var j,
                k,
                l,
                m,
                n,
                o,
                p = f !== g ? "nextSibling" : "previousSibling",
                q = b.parentNode,
                r = h && b.nodeName.toLowerCase(),
                s = !i && !h,
                t = !1;if (q) {
              if (f) {
                while (p) {
                  m = b;while (m = m[p]) {
                    if (h ? m.nodeName.toLowerCase() === r : 1 === m.nodeType) return !1;
                  }o = p = "only" === a && !o && "nextSibling";
                }return !0;
              }if (o = [g ? q.firstChild : q.lastChild], g && s) {
                m = q, l = m[u] || (m[u] = {}), k = l[m.uniqueID] || (l[m.uniqueID] = {}), j = k[a] || [], n = j[0] === w && j[1], t = n && j[2], m = n && q.childNodes[n];while (m = ++n && m && m[p] || (t = n = 0) || o.pop()) {
                  if (1 === m.nodeType && ++t && m === b) {
                    k[a] = [w, n, t];break;
                  }
                }
              } else if (s && (m = b, l = m[u] || (m[u] = {}), k = l[m.uniqueID] || (l[m.uniqueID] = {}), j = k[a] || [], n = j[0] === w && j[1], t = n), t === !1) while (m = ++n && m && m[p] || (t = n = 0) || o.pop()) {
                if ((h ? m.nodeName.toLowerCase() === r : 1 === m.nodeType) && ++t && (s && (l = m[u] || (m[u] = {}), k = l[m.uniqueID] || (l[m.uniqueID] = {}), k[a] = [w, t]), m === b)) break;
              }return t -= e, t === d || t % d === 0 && t / d >= 0;
            }
          };
        }, PSEUDO: function (a, b) {
          var c,
              e = d.pseudos[a] || d.setFilters[a.toLowerCase()] || fa.error("unsupported pseudo: " + a);return e[u] ? e(b) : e.length > 1 ? (c = [a, a, "", b], d.setFilters.hasOwnProperty(a.toLowerCase()) ? ha(function (a, c) {
            var d,
                f = e(a, b),
                g = f.length;while (g--) {
              d = J(a, f[g]), a[d] = !(c[d] = f[g]);
            }
          }) : function (a) {
            return e(a, 0, c);
          }) : e;
        } }, pseudos: { not: ha(function (a) {
          var b = [],
              c = [],
              d = h(a.replace(Q, "$1"));return d[u] ? ha(function (a, b, c, e) {
            var f,
                g = d(a, null, e, []),
                h = a.length;while (h--) {
              (f = g[h]) && (a[h] = !(b[h] = f));
            }
          }) : function (a, e, f) {
            return b[0] = a, d(b, null, f, c), b[0] = null, !c.pop();
          };
        }), has: ha(function (a) {
          return function (b) {
            return fa(a, b).length > 0;
          };
        }), contains: ha(function (a) {
          return a = a.replace(ba, ca), function (b) {
            return (b.textContent || b.innerText || e(b)).indexOf(a) > -1;
          };
        }), lang: ha(function (a) {
          return V.test(a || "") || fa.error("unsupported lang: " + a), a = a.replace(ba, ca).toLowerCase(), function (b) {
            var c;do {
              if (c = p ? b.lang : b.getAttribute("xml:lang") || b.getAttribute("lang")) return c = c.toLowerCase(), c === a || 0 === c.indexOf(a + "-");
            } while ((b = b.parentNode) && 1 === b.nodeType);return !1;
          };
        }), target: function (b) {
          var c = a.location && a.location.hash;return c && c.slice(1) === b.id;
        }, root: function (a) {
          return a === o;
        }, focus: function (a) {
          return a === n.activeElement && (!n.hasFocus || n.hasFocus()) && !!(a.type || a.href || ~a.tabIndex);
        }, enabled: function (a) {
          return a.disabled === !1;
        }, disabled: function (a) {
          return a.disabled === !0;
        }, checked: function (a) {
          var b = a.nodeName.toLowerCase();return "input" === b && !!a.checked || "option" === b && !!a.selected;
        }, selected: function (a) {
          return a.parentNode && a.parentNode.selectedIndex, a.selected === !0;
        }, empty: function (a) {
          for (a = a.firstChild; a; a = a.nextSibling) {
            if (a.nodeType < 6) return !1;
          }return !0;
        }, parent: function (a) {
          return !d.pseudos.empty(a);
        }, header: function (a) {
          return Y.test(a.nodeName);
        }, input: function (a) {
          return X.test(a.nodeName);
        }, button: function (a) {
          var b = a.nodeName.toLowerCase();return "input" === b && "button" === a.type || "button" === b;
        }, text: function (a) {
          var b;return "input" === a.nodeName.toLowerCase() && "text" === a.type && (null == (b = a.getAttribute("type")) || "text" === b.toLowerCase());
        }, first: na(function () {
          return [0];
        }), last: na(function (a, b) {
          return [b - 1];
        }), eq: na(function (a, b, c) {
          return [0 > c ? c + b : c];
        }), even: na(function (a, b) {
          for (var c = 0; b > c; c += 2) {
            a.push(c);
          }return a;
        }), odd: na(function (a, b) {
          for (var c = 1; b > c; c += 2) {
            a.push(c);
          }return a;
        }), lt: na(function (a, b, c) {
          for (var d = 0 > c ? c + b : c; --d >= 0;) {
            a.push(d);
          }return a;
        }), gt: na(function (a, b, c) {
          for (var d = 0 > c ? c + b : c; ++d < b;) {
            a.push(d);
          }return a;
        }) } }, d.pseudos.nth = d.pseudos.eq;for (b in { radio: !0, checkbox: !0, file: !0, password: !0, image: !0 }) {
      d.pseudos[b] = la(b);
    }for (b in { submit: !0, reset: !0 }) {
      d.pseudos[b] = ma(b);
    }function pa() {}pa.prototype = d.filters = d.pseudos, d.setFilters = new pa(), g = fa.tokenize = function (a, b) {
      var c,
          e,
          f,
          g,
          h,
          i,
          j,
          k = z[a + " "];if (k) return b ? 0 : k.slice(0);h = a, i = [], j = d.preFilter;while (h) {
        c && !(e = R.exec(h)) || (e && (h = h.slice(e[0].length) || h), i.push(f = [])), c = !1, (e = S.exec(h)) && (c = e.shift(), f.push({ value: c, type: e[0].replace(Q, " ") }), h = h.slice(c.length));for (g in d.filter) {
          !(e = W[g].exec(h)) || j[g] && !(e = j[g](e)) || (c = e.shift(), f.push({ value: c, type: g, matches: e }), h = h.slice(c.length));
        }if (!c) break;
      }return b ? h.length : h ? fa.error(a) : z(a, i).slice(0);
    };function qa(a) {
      for (var b = 0, c = a.length, d = ""; c > b; b++) {
        d += a[b].value;
      }return d;
    }function ra(a, b, c) {
      var d = b.dir,
          e = c && "parentNode" === d,
          f = x++;return b.first ? function (b, c, f) {
        while (b = b[d]) {
          if (1 === b.nodeType || e) return a(b, c, f);
        }
      } : function (b, c, g) {
        var h,
            i,
            j,
            k = [w, f];if (g) {
          while (b = b[d]) {
            if ((1 === b.nodeType || e) && a(b, c, g)) return !0;
          }
        } else while (b = b[d]) {
          if (1 === b.nodeType || e) {
            if (j = b[u] || (b[u] = {}), i = j[b.uniqueID] || (j[b.uniqueID] = {}), (h = i[d]) && h[0] === w && h[1] === f) return k[2] = h[2];if (i[d] = k, k[2] = a(b, c, g)) return !0;
          }
        }
      };
    }function sa(a) {
      return a.length > 1 ? function (b, c, d) {
        var e = a.length;while (e--) {
          if (!a[e](b, c, d)) return !1;
        }return !0;
      } : a[0];
    }function ta(a, b, c) {
      for (var d = 0, e = b.length; e > d; d++) {
        fa(a, b[d], c);
      }return c;
    }function ua(a, b, c, d, e) {
      for (var f, g = [], h = 0, i = a.length, j = null != b; i > h; h++) {
        (f = a[h]) && (c && !c(f, d, e) || (g.push(f), j && b.push(h)));
      }return g;
    }function va(a, b, c, d, e, f) {
      return d && !d[u] && (d = va(d)), e && !e[u] && (e = va(e, f)), ha(function (f, g, h, i) {
        var j,
            k,
            l,
            m = [],
            n = [],
            o = g.length,
            p = f || ta(b || "*", h.nodeType ? [h] : h, []),
            q = !a || !f && b ? p : ua(p, m, a, h, i),
            r = c ? e || (f ? a : o || d) ? [] : g : q;if (c && c(q, r, h, i), d) {
          j = ua(r, n), d(j, [], h, i), k = j.length;while (k--) {
            (l = j[k]) && (r[n[k]] = !(q[n[k]] = l));
          }
        }if (f) {
          if (e || a) {
            if (e) {
              j = [], k = r.length;while (k--) {
                (l = r[k]) && j.push(q[k] = l);
              }e(null, r = [], j, i);
            }k = r.length;while (k--) {
              (l = r[k]) && (j = e ? J(f, l) : m[k]) > -1 && (f[j] = !(g[j] = l));
            }
          }
        } else r = ua(r === g ? r.splice(o, r.length) : r), e ? e(null, g, r, i) : H.apply(g, r);
      });
    }function wa(a) {
      for (var b, c, e, f = a.length, g = d.relative[a[0].type], h = g || d.relative[" "], i = g ? 1 : 0, k = ra(function (a) {
        return a === b;
      }, h, !0), l = ra(function (a) {
        return J(b, a) > -1;
      }, h, !0), m = [function (a, c, d) {
        var e = !g && (d || c !== j) || ((b = c).nodeType ? k(a, c, d) : l(a, c, d));return b = null, e;
      }]; f > i; i++) {
        if (c = d.relative[a[i].type]) m = [ra(sa(m), c)];else {
          if (c = d.filter[a[i].type].apply(null, a[i].matches), c[u]) {
            for (e = ++i; f > e; e++) {
              if (d.relative[a[e].type]) break;
            }return va(i > 1 && sa(m), i > 1 && qa(a.slice(0, i - 1).concat({ value: " " === a[i - 2].type ? "*" : "" })).replace(Q, "$1"), c, e > i && wa(a.slice(i, e)), f > e && wa(a = a.slice(e)), f > e && qa(a));
          }m.push(c);
        }
      }return sa(m);
    }function xa(a, b) {
      var c = b.length > 0,
          e = a.length > 0,
          f = function (f, g, h, i, k) {
        var l,
            o,
            q,
            r = 0,
            s = "0",
            t = f && [],
            u = [],
            v = j,
            x = f || e && d.find.TAG("*", k),
            y = w += null == v ? 1 : Math.random() || .1,
            z = x.length;for (k && (j = g === n || g || k); s !== z && null != (l = x[s]); s++) {
          if (e && l) {
            o = 0, g || l.ownerDocument === n || (m(l), h = !p);while (q = a[o++]) {
              if (q(l, g || n, h)) {
                i.push(l);break;
              }
            }k && (w = y);
          }c && ((l = !q && l) && r--, f && t.push(l));
        }if (r += s, c && s !== r) {
          o = 0;while (q = b[o++]) {
            q(t, u, g, h);
          }if (f) {
            if (r > 0) while (s--) {
              t[s] || u[s] || (u[s] = F.call(i));
            }u = ua(u);
          }H.apply(i, u), k && !f && u.length > 0 && r + b.length > 1 && fa.uniqueSort(i);
        }return k && (w = y, j = v), t;
      };return c ? ha(f) : f;
    }return h = fa.compile = function (a, b) {
      var c,
          d = [],
          e = [],
          f = A[a + " "];if (!f) {
        b || (b = g(a)), c = b.length;while (c--) {
          f = wa(b[c]), f[u] ? d.push(f) : e.push(f);
        }f = A(a, xa(e, d)), f.selector = a;
      }return f;
    }, i = fa.select = function (a, b, e, f) {
      var i,
          j,
          k,
          l,
          m,
          n = "function" == typeof a && a,
          o = !f && g(a = n.selector || a);if (e = e || [], 1 === o.length) {
        if (j = o[0] = o[0].slice(0), j.length > 2 && "ID" === (k = j[0]).type && c.getById && 9 === b.nodeType && p && d.relative[j[1].type]) {
          if (b = (d.find.ID(k.matches[0].replace(ba, ca), b) || [])[0], !b) return e;n && (b = b.parentNode), a = a.slice(j.shift().value.length);
        }i = W.needsContext.test(a) ? 0 : j.length;while (i--) {
          if (k = j[i], d.relative[l = k.type]) break;if ((m = d.find[l]) && (f = m(k.matches[0].replace(ba, ca), _.test(j[0].type) && oa(b.parentNode) || b))) {
            if (j.splice(i, 1), a = f.length && qa(j), !a) return H.apply(e, f), e;break;
          }
        }
      }return (n || h(a, o))(f, b, !p, e, !b || _.test(a) && oa(b.parentNode) || b), e;
    }, c.sortStable = u.split("").sort(B).join("") === u, c.detectDuplicates = !!l, m(), c.sortDetached = ia(function (a) {
      return 1 & a.compareDocumentPosition(n.createElement("div"));
    }), ia(function (a) {
      return a.innerHTML = "<a href='#'></a>", "#" === a.firstChild.getAttribute("href");
    }) || ja("type|href|height|width", function (a, b, c) {
      return c ? void 0 : a.getAttribute(b, "type" === b.toLowerCase() ? 1 : 2);
    }), c.attributes && ia(function (a) {
      return a.innerHTML = "<input/>", a.firstChild.setAttribute("value", ""), "" === a.firstChild.getAttribute("value");
    }) || ja("value", function (a, b, c) {
      return c || "input" !== a.nodeName.toLowerCase() ? void 0 : a.defaultValue;
    }), ia(function (a) {
      return null == a.getAttribute("disabled");
    }) || ja(K, function (a, b, c) {
      var d;return c ? void 0 : a[b] === !0 ? b.toLowerCase() : (d = a.getAttributeNode(b)) && d.specified ? d.value : null;
    }), fa;
  }(a);n.find = t, n.expr = t.selectors, n.expr[":"] = n.expr.pseudos, n.uniqueSort = n.unique = t.uniqueSort, n.text = t.getText, n.isXMLDoc = t.isXML, n.contains = t.contains;var u = function (a, b, c) {
    var d = [],
        e = void 0 !== c;while ((a = a[b]) && 9 !== a.nodeType) {
      if (1 === a.nodeType) {
        if (e && n(a).is(c)) break;d.push(a);
      }
    }return d;
  },
      v = function (a, b) {
    for (var c = []; a; a = a.nextSibling) {
      1 === a.nodeType && a !== b && c.push(a);
    }return c;
  },
      w = n.expr.match.needsContext,
      x = /^<([\w-]+)\s*\/?>(?:<\/\1>|)$/,
      y = /^.[^:#\[\.,]*$/;function z(a, b, c) {
    if (n.isFunction(b)) return n.grep(a, function (a, d) {
      return !!b.call(a, d, a) !== c;
    });if (b.nodeType) return n.grep(a, function (a) {
      return a === b !== c;
    });if ("string" == typeof b) {
      if (y.test(b)) return n.filter(b, a, c);b = n.filter(b, a);
    }return n.grep(a, function (a) {
      return h.call(b, a) > -1 !== c;
    });
  }n.filter = function (a, b, c) {
    var d = b[0];return c && (a = ":not(" + a + ")"), 1 === b.length && 1 === d.nodeType ? n.find.matchesSelector(d, a) ? [d] : [] : n.find.matches(a, n.grep(b, function (a) {
      return 1 === a.nodeType;
    }));
  }, n.fn.extend({ find: function (a) {
      var b,
          c = this.length,
          d = [],
          e = this;if ("string" != typeof a) return this.pushStack(n(a).filter(function () {
        for (b = 0; c > b; b++) {
          if (n.contains(e[b], this)) return !0;
        }
      }));for (b = 0; c > b; b++) {
        n.find(a, e[b], d);
      }return d = this.pushStack(c > 1 ? n.unique(d) : d), d.selector = this.selector ? this.selector + " " + a : a, d;
    }, filter: function (a) {
      return this.pushStack(z(this, a || [], !1));
    }, not: function (a) {
      return this.pushStack(z(this, a || [], !0));
    }, is: function (a) {
      return !!z(this, "string" == typeof a && w.test(a) ? n(a) : a || [], !1).length;
    } });var A,
      B = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
      C = n.fn.init = function (a, b, c) {
    var e, f;if (!a) return this;if (c = c || A, "string" == typeof a) {
      if (e = "<" === a[0] && ">" === a[a.length - 1] && a.length >= 3 ? [null, a, null] : B.exec(a), !e || !e[1] && b) return !b || b.jquery ? (b || c).find(a) : this.constructor(b).find(a);if (e[1]) {
        if (b = b instanceof n ? b[0] : b, n.merge(this, n.parseHTML(e[1], b && b.nodeType ? b.ownerDocument || b : d, !0)), x.test(e[1]) && n.isPlainObject(b)) for (e in b) {
          n.isFunction(this[e]) ? this[e](b[e]) : this.attr(e, b[e]);
        }return this;
      }return f = d.getElementById(e[2]), f && f.parentNode && (this.length = 1, this[0] = f), this.context = d, this.selector = a, this;
    }return a.nodeType ? (this.context = this[0] = a, this.length = 1, this) : n.isFunction(a) ? void 0 !== c.ready ? c.ready(a) : a(n) : (void 0 !== a.selector && (this.selector = a.selector, this.context = a.context), n.makeArray(a, this));
  };C.prototype = n.fn, A = n(d);var D = /^(?:parents|prev(?:Until|All))/,
      E = { children: !0, contents: !0, next: !0, prev: !0 };n.fn.extend({ has: function (a) {
      var b = n(a, this),
          c = b.length;return this.filter(function () {
        for (var a = 0; c > a; a++) {
          if (n.contains(this, b[a])) return !0;
        }
      });
    }, closest: function (a, b) {
      for (var c, d = 0, e = this.length, f = [], g = w.test(a) || "string" != typeof a ? n(a, b || this.context) : 0; e > d; d++) {
        for (c = this[d]; c && c !== b; c = c.parentNode) {
          if (c.nodeType < 11 && (g ? g.index(c) > -1 : 1 === c.nodeType && n.find.matchesSelector(c, a))) {
            f.push(c);break;
          }
        }
      }return this.pushStack(f.length > 1 ? n.uniqueSort(f) : f);
    }, index: function (a) {
      return a ? "string" == typeof a ? h.call(n(a), this[0]) : h.call(this, a.jquery ? a[0] : a) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
    }, add: function (a, b) {
      return this.pushStack(n.uniqueSort(n.merge(this.get(), n(a, b))));
    }, addBack: function (a) {
      return this.add(null == a ? this.prevObject : this.prevObject.filter(a));
    } });function F(a, b) {
    while ((a = a[b]) && 1 !== a.nodeType) {}return a;
  }n.each({ parent: function (a) {
      var b = a.parentNode;return b && 11 !== b.nodeType ? b : null;
    }, parents: function (a) {
      return u(a, "parentNode");
    }, parentsUntil: function (a, b, c) {
      return u(a, "parentNode", c);
    }, next: function (a) {
      return F(a, "nextSibling");
    }, prev: function (a) {
      return F(a, "previousSibling");
    }, nextAll: function (a) {
      return u(a, "nextSibling");
    }, prevAll: function (a) {
      return u(a, "previousSibling");
    }, nextUntil: function (a, b, c) {
      return u(a, "nextSibling", c);
    }, prevUntil: function (a, b, c) {
      return u(a, "previousSibling", c);
    }, siblings: function (a) {
      return v((a.parentNode || {}).firstChild, a);
    }, children: function (a) {
      return v(a.firstChild);
    }, contents: function (a) {
      return a.contentDocument || n.merge([], a.childNodes);
    } }, function (a, b) {
    n.fn[a] = function (c, d) {
      var e = n.map(this, b, c);return "Until" !== a.slice(-5) && (d = c), d && "string" == typeof d && (e = n.filter(d, e)), this.length > 1 && (E[a] || n.uniqueSort(e), D.test(a) && e.reverse()), this.pushStack(e);
    };
  });var G = /\S+/g;function H(a) {
    var b = {};return n.each(a.match(G) || [], function (a, c) {
      b[c] = !0;
    }), b;
  }n.Callbacks = function (a) {
    a = "string" == typeof a ? H(a) : n.extend({}, a);var b,
        c,
        d,
        e,
        f = [],
        g = [],
        h = -1,
        i = function () {
      for (e = a.once, d = b = !0; g.length; h = -1) {
        c = g.shift();while (++h < f.length) {
          f[h].apply(c[0], c[1]) === !1 && a.stopOnFalse && (h = f.length, c = !1);
        }
      }a.memory || (c = !1), b = !1, e && (f = c ? [] : "");
    },
        j = { add: function () {
        return f && (c && !b && (h = f.length - 1, g.push(c)), function d(b) {
          n.each(b, function (b, c) {
            n.isFunction(c) ? a.unique && j.has(c) || f.push(c) : c && c.length && "string" !== n.type(c) && d(c);
          });
        }(arguments), c && !b && i()), this;
      }, remove: function () {
        return n.each(arguments, function (a, b) {
          var c;while ((c = n.inArray(b, f, c)) > -1) {
            f.splice(c, 1), h >= c && h--;
          }
        }), this;
      }, has: function (a) {
        return a ? n.inArray(a, f) > -1 : f.length > 0;
      }, empty: function () {
        return f && (f = []), this;
      }, disable: function () {
        return e = g = [], f = c = "", this;
      }, disabled: function () {
        return !f;
      }, lock: function () {
        return e = g = [], c || (f = c = ""), this;
      }, locked: function () {
        return !!e;
      }, fireWith: function (a, c) {
        return e || (c = c || [], c = [a, c.slice ? c.slice() : c], g.push(c), b || i()), this;
      }, fire: function () {
        return j.fireWith(this, arguments), this;
      }, fired: function () {
        return !!d;
      } };return j;
  }, n.extend({ Deferred: function (a) {
      var b = [["resolve", "done", n.Callbacks("once memory"), "resolved"], ["reject", "fail", n.Callbacks("once memory"), "rejected"], ["notify", "progress", n.Callbacks("memory")]],
          c = "pending",
          d = { state: function () {
          return c;
        }, always: function () {
          return e.done(arguments).fail(arguments), this;
        }, then: function () {
          var a = arguments;return n.Deferred(function (c) {
            n.each(b, function (b, f) {
              var g = n.isFunction(a[b]) && a[b];e[f[1]](function () {
                var a = g && g.apply(this, arguments);a && n.isFunction(a.promise) ? a.promise().progress(c.notify).done(c.resolve).fail(c.reject) : c[f[0] + "With"](this === d ? c.promise() : this, g ? [a] : arguments);
              });
            }), a = null;
          }).promise();
        }, promise: function (a) {
          return null != a ? n.extend(a, d) : d;
        } },
          e = {};return d.pipe = d.then, n.each(b, function (a, f) {
        var g = f[2],
            h = f[3];d[f[1]] = g.add, h && g.add(function () {
          c = h;
        }, b[1 ^ a][2].disable, b[2][2].lock), e[f[0]] = function () {
          return e[f[0] + "With"](this === e ? d : this, arguments), this;
        }, e[f[0] + "With"] = g.fireWith;
      }), d.promise(e), a && a.call(e, e), e;
    }, when: function (a) {
      var b = 0,
          c = e.call(arguments),
          d = c.length,
          f = 1 !== d || a && n.isFunction(a.promise) ? d : 0,
          g = 1 === f ? a : n.Deferred(),
          h = function (a, b, c) {
        return function (d) {
          b[a] = this, c[a] = arguments.length > 1 ? e.call(arguments) : d, c === i ? g.notifyWith(b, c) : --f || g.resolveWith(b, c);
        };
      },
          i,
          j,
          k;if (d > 1) for (i = new Array(d), j = new Array(d), k = new Array(d); d > b; b++) {
        c[b] && n.isFunction(c[b].promise) ? c[b].promise().progress(h(b, j, i)).done(h(b, k, c)).fail(g.reject) : --f;
      }return f || g.resolveWith(k, c), g.promise();
    } });var I;n.fn.ready = function (a) {
    return n.ready.promise().done(a), this;
  }, n.extend({ isReady: !1, readyWait: 1, holdReady: function (a) {
      a ? n.readyWait++ : n.ready(!0);
    }, ready: function (a) {
      (a === !0 ? --n.readyWait : n.isReady) || (n.isReady = !0, a !== !0 && --n.readyWait > 0 || (I.resolveWith(d, [n]), n.fn.triggerHandler && (n(d).triggerHandler("ready"), n(d).off("ready"))));
    } });function J() {
    d.removeEventListener("DOMContentLoaded", J), a.removeEventListener("load", J), n.ready();
  }n.ready.promise = function (b) {
    return I || (I = n.Deferred(), "complete" === d.readyState || "loading" !== d.readyState && !d.documentElement.doScroll ? a.setTimeout(n.ready) : (d.addEventListener("DOMContentLoaded", J), a.addEventListener("load", J))), I.promise(b);
  }, n.ready.promise();var K = function (a, b, c, d, e, f, g) {
    var h = 0,
        i = a.length,
        j = null == c;if ("object" === n.type(c)) {
      e = !0;for (h in c) {
        K(a, b, h, c[h], !0, f, g);
      }
    } else if (void 0 !== d && (e = !0, n.isFunction(d) || (g = !0), j && (g ? (b.call(a, d), b = null) : (j = b, b = function (a, b, c) {
      return j.call(n(a), c);
    })), b)) for (; i > h; h++) {
      b(a[h], c, g ? d : d.call(a[h], h, b(a[h], c)));
    }return e ? a : j ? b.call(a) : i ? b(a[0], c) : f;
  },
      L = function (a) {
    return 1 === a.nodeType || 9 === a.nodeType || !+a.nodeType;
  };function M() {
    this.expando = n.expando + M.uid++;
  }M.uid = 1, M.prototype = { register: function (a, b) {
      var c = b || {};return a.nodeType ? a[this.expando] = c : Object.defineProperty(a, this.expando, { value: c, writable: !0, configurable: !0 }), a[this.expando];
    }, cache: function (a) {
      if (!L(a)) return {};var b = a[this.expando];return b || (b = {}, L(a) && (a.nodeType ? a[this.expando] = b : Object.defineProperty(a, this.expando, { value: b, configurable: !0 }))), b;
    }, set: function (a, b, c) {
      var d,
          e = this.cache(a);if ("string" == typeof b) e[b] = c;else for (d in b) {
        e[d] = b[d];
      }return e;
    }, get: function (a, b) {
      return void 0 === b ? this.cache(a) : a[this.expando] && a[this.expando][b];
    }, access: function (a, b, c) {
      var d;return void 0 === b || b && "string" == typeof b && void 0 === c ? (d = this.get(a, b), void 0 !== d ? d : this.get(a, n.camelCase(b))) : (this.set(a, b, c), void 0 !== c ? c : b);
    }, remove: function (a, b) {
      var c,
          d,
          e,
          f = a[this.expando];if (void 0 !== f) {
        if (void 0 === b) this.register(a);else {
          n.isArray(b) ? d = b.concat(b.map(n.camelCase)) : (e = n.camelCase(b), b in f ? d = [b, e] : (d = e, d = d in f ? [d] : d.match(G) || [])), c = d.length;while (c--) {
            delete f[d[c]];
          }
        }(void 0 === b || n.isEmptyObject(f)) && (a.nodeType ? a[this.expando] = void 0 : delete a[this.expando]);
      }
    }, hasData: function (a) {
      var b = a[this.expando];return void 0 !== b && !n.isEmptyObject(b);
    } };var N = new M(),
      O = new M(),
      P = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      Q = /[A-Z]/g;function R(a, b, c) {
    var d;if (void 0 === c && 1 === a.nodeType) if (d = "data-" + b.replace(Q, "-$&").toLowerCase(), c = a.getAttribute(d), "string" == typeof c) {
      try {
        c = "true" === c ? !0 : "false" === c ? !1 : "null" === c ? null : +c + "" === c ? +c : P.test(c) ? n.parseJSON(c) : c;
      } catch (e) {}O.set(a, b, c);
    } else c = void 0;return c;
  }n.extend({ hasData: function (a) {
      return O.hasData(a) || N.hasData(a);
    }, data: function (a, b, c) {
      return O.access(a, b, c);
    }, removeData: function (a, b) {
      O.remove(a, b);
    }, _data: function (a, b, c) {
      return N.access(a, b, c);
    }, _removeData: function (a, b) {
      N.remove(a, b);
    } }), n.fn.extend({ data: function (a, b) {
      var c,
          d,
          e,
          f = this[0],
          g = f && f.attributes;if (void 0 === a) {
        if (this.length && (e = O.get(f), 1 === f.nodeType && !N.get(f, "hasDataAttrs"))) {
          c = g.length;while (c--) {
            g[c] && (d = g[c].name, 0 === d.indexOf("data-") && (d = n.camelCase(d.slice(5)), R(f, d, e[d])));
          }N.set(f, "hasDataAttrs", !0);
        }return e;
      }return "object" == typeof a ? this.each(function () {
        O.set(this, a);
      }) : K(this, function (b) {
        var c, d;if (f && void 0 === b) {
          if (c = O.get(f, a) || O.get(f, a.replace(Q, "-$&").toLowerCase()), void 0 !== c) return c;if (d = n.camelCase(a), c = O.get(f, d), void 0 !== c) return c;if (c = R(f, d, void 0), void 0 !== c) return c;
        } else d = n.camelCase(a), this.each(function () {
          var c = O.get(this, d);O.set(this, d, b), a.indexOf("-") > -1 && void 0 !== c && O.set(this, a, b);
        });
      }, null, b, arguments.length > 1, null, !0);
    }, removeData: function (a) {
      return this.each(function () {
        O.remove(this, a);
      });
    } }), n.extend({ queue: function (a, b, c) {
      var d;return a ? (b = (b || "fx") + "queue", d = N.get(a, b), c && (!d || n.isArray(c) ? d = N.access(a, b, n.makeArray(c)) : d.push(c)), d || []) : void 0;
    }, dequeue: function (a, b) {
      b = b || "fx";var c = n.queue(a, b),
          d = c.length,
          e = c.shift(),
          f = n._queueHooks(a, b),
          g = function () {
        n.dequeue(a, b);
      };"inprogress" === e && (e = c.shift(), d--), e && ("fx" === b && c.unshift("inprogress"), delete f.stop, e.call(a, g, f)), !d && f && f.empty.fire();
    }, _queueHooks: function (a, b) {
      var c = b + "queueHooks";return N.get(a, c) || N.access(a, c, { empty: n.Callbacks("once memory").add(function () {
          N.remove(a, [b + "queue", c]);
        }) });
    } }), n.fn.extend({ queue: function (a, b) {
      var c = 2;return "string" != typeof a && (b = a, a = "fx", c--), arguments.length < c ? n.queue(this[0], a) : void 0 === b ? this : this.each(function () {
        var c = n.queue(this, a, b);n._queueHooks(this, a), "fx" === a && "inprogress" !== c[0] && n.dequeue(this, a);
      });
    }, dequeue: function (a) {
      return this.each(function () {
        n.dequeue(this, a);
      });
    }, clearQueue: function (a) {
      return this.queue(a || "fx", []);
    }, promise: function (a, b) {
      var c,
          d = 1,
          e = n.Deferred(),
          f = this,
          g = this.length,
          h = function () {
        --d || e.resolveWith(f, [f]);
      };"string" != typeof a && (b = a, a = void 0), a = a || "fx";while (g--) {
        c = N.get(f[g], a + "queueHooks"), c && c.empty && (d++, c.empty.add(h));
      }return h(), e.promise(b);
    } });var S = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,
      T = new RegExp("^(?:([+-])=|)(" + S + ")([a-z%]*)$", "i"),
      U = ["Top", "Right", "Bottom", "Left"],
      V = function (a, b) {
    return a = b || a, "none" === n.css(a, "display") || !n.contains(a.ownerDocument, a);
  };function W(a, b, c, d) {
    var e,
        f = 1,
        g = 20,
        h = d ? function () {
      return d.cur();
    } : function () {
      return n.css(a, b, "");
    },
        i = h(),
        j = c && c[3] || (n.cssNumber[b] ? "" : "px"),
        k = (n.cssNumber[b] || "px" !== j && +i) && T.exec(n.css(a, b));if (k && k[3] !== j) {
      j = j || k[3], c = c || [], k = +i || 1;do {
        f = f || ".5", k /= f, n.style(a, b, k + j);
      } while (f !== (f = h() / i) && 1 !== f && --g);
    }return c && (k = +k || +i || 0, e = c[1] ? k + (c[1] + 1) * c[2] : +c[2], d && (d.unit = j, d.start = k, d.end = e)), e;
  }var X = /^(?:checkbox|radio)$/i,
      Y = /<([\w:-]+)/,
      Z = /^$|\/(?:java|ecma)script/i,
      $ = { option: [1, "<select multiple='multiple'>", "</select>"], thead: [1, "<table>", "</table>"], col: [2, "<table><colgroup>", "</colgroup></table>"], tr: [2, "<table><tbody>", "</tbody></table>"], td: [3, "<table><tbody><tr>", "</tr></tbody></table>"], _default: [0, "", ""] };$.optgroup = $.option, $.tbody = $.tfoot = $.colgroup = $.caption = $.thead, $.th = $.td;function _(a, b) {
    var c = "undefined" != typeof a.getElementsByTagName ? a.getElementsByTagName(b || "*") : "undefined" != typeof a.querySelectorAll ? a.querySelectorAll(b || "*") : [];return void 0 === b || b && n.nodeName(a, b) ? n.merge([a], c) : c;
  }function aa(a, b) {
    for (var c = 0, d = a.length; d > c; c++) {
      N.set(a[c], "globalEval", !b || N.get(b[c], "globalEval"));
    }
  }var ba = /<|&#?\w+;/;function ca(a, b, c, d, e) {
    for (var f, g, h, i, j, k, l = b.createDocumentFragment(), m = [], o = 0, p = a.length; p > o; o++) {
      if (f = a[o], f || 0 === f) if ("object" === n.type(f)) n.merge(m, f.nodeType ? [f] : f);else if (ba.test(f)) {
        g = g || l.appendChild(b.createElement("div")), h = (Y.exec(f) || ["", ""])[1].toLowerCase(), i = $[h] || $._default, g.innerHTML = i[1] + n.htmlPrefilter(f) + i[2], k = i[0];while (k--) {
          g = g.lastChild;
        }n.merge(m, g.childNodes), g = l.firstChild, g.textContent = "";
      } else m.push(b.createTextNode(f));
    }l.textContent = "", o = 0;while (f = m[o++]) {
      if (d && n.inArray(f, d) > -1) e && e.push(f);else if (j = n.contains(f.ownerDocument, f), g = _(l.appendChild(f), "script"), j && aa(g), c) {
        k = 0;while (f = g[k++]) {
          Z.test(f.type || "") && c.push(f);
        }
      }
    }return l;
  }!function () {
    var a = d.createDocumentFragment(),
        b = a.appendChild(d.createElement("div")),
        c = d.createElement("input");c.setAttribute("type", "radio"), c.setAttribute("checked", "checked"), c.setAttribute("name", "t"), b.appendChild(c), l.checkClone = b.cloneNode(!0).cloneNode(!0).lastChild.checked, b.innerHTML = "<textarea>x</textarea>", l.noCloneChecked = !!b.cloneNode(!0).lastChild.defaultValue;
  }();var da = /^key/,
      ea = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
      fa = /^([^.]*)(?:\.(.+)|)/;function ga() {
    return !0;
  }function ha() {
    return !1;
  }function ia() {
    try {
      return d.activeElement;
    } catch (a) {}
  }function ja(a, b, c, d, e, f) {
    var g, h;if ("object" == typeof b) {
      "string" != typeof c && (d = d || c, c = void 0);for (h in b) {
        ja(a, h, c, d, b[h], f);
      }return a;
    }if (null == d && null == e ? (e = c, d = c = void 0) : null == e && ("string" == typeof c ? (e = d, d = void 0) : (e = d, d = c, c = void 0)), e === !1) e = ha;else if (!e) return a;return 1 === f && (g = e, e = function (a) {
      return n().off(a), g.apply(this, arguments);
    }, e.guid = g.guid || (g.guid = n.guid++)), a.each(function () {
      n.event.add(this, b, e, d, c);
    });
  }n.event = { global: {}, add: function (a, b, c, d, e) {
      var f,
          g,
          h,
          i,
          j,
          k,
          l,
          m,
          o,
          p,
          q,
          r = N.get(a);if (r) {
        c.handler && (f = c, c = f.handler, e = f.selector), c.guid || (c.guid = n.guid++), (i = r.events) || (i = r.events = {}), (g = r.handle) || (g = r.handle = function (b) {
          return "undefined" != typeof n && n.event.triggered !== b.type ? n.event.dispatch.apply(a, arguments) : void 0;
        }), b = (b || "").match(G) || [""], j = b.length;while (j--) {
          h = fa.exec(b[j]) || [], o = q = h[1], p = (h[2] || "").split(".").sort(), o && (l = n.event.special[o] || {}, o = (e ? l.delegateType : l.bindType) || o, l = n.event.special[o] || {}, k = n.extend({ type: o, origType: q, data: d, handler: c, guid: c.guid, selector: e, needsContext: e && n.expr.match.needsContext.test(e), namespace: p.join(".") }, f), (m = i[o]) || (m = i[o] = [], m.delegateCount = 0, l.setup && l.setup.call(a, d, p, g) !== !1 || a.addEventListener && a.addEventListener(o, g)), l.add && (l.add.call(a, k), k.handler.guid || (k.handler.guid = c.guid)), e ? m.splice(m.delegateCount++, 0, k) : m.push(k), n.event.global[o] = !0);
        }
      }
    }, remove: function (a, b, c, d, e) {
      var f,
          g,
          h,
          i,
          j,
          k,
          l,
          m,
          o,
          p,
          q,
          r = N.hasData(a) && N.get(a);if (r && (i = r.events)) {
        b = (b || "").match(G) || [""], j = b.length;while (j--) {
          if (h = fa.exec(b[j]) || [], o = q = h[1], p = (h[2] || "").split(".").sort(), o) {
            l = n.event.special[o] || {}, o = (d ? l.delegateType : l.bindType) || o, m = i[o] || [], h = h[2] && new RegExp("(^|\\.)" + p.join("\\.(?:.*\\.|)") + "(\\.|$)"), g = f = m.length;while (f--) {
              k = m[f], !e && q !== k.origType || c && c.guid !== k.guid || h && !h.test(k.namespace) || d && d !== k.selector && ("**" !== d || !k.selector) || (m.splice(f, 1), k.selector && m.delegateCount--, l.remove && l.remove.call(a, k));
            }g && !m.length && (l.teardown && l.teardown.call(a, p, r.handle) !== !1 || n.removeEvent(a, o, r.handle), delete i[o]);
          } else for (o in i) {
            n.event.remove(a, o + b[j], c, d, !0);
          }
        }n.isEmptyObject(i) && N.remove(a, "handle events");
      }
    }, dispatch: function (a) {
      a = n.event.fix(a);var b,
          c,
          d,
          f,
          g,
          h = [],
          i = e.call(arguments),
          j = (N.get(this, "events") || {})[a.type] || [],
          k = n.event.special[a.type] || {};if (i[0] = a, a.delegateTarget = this, !k.preDispatch || k.preDispatch.call(this, a) !== !1) {
        h = n.event.handlers.call(this, a, j), b = 0;while ((f = h[b++]) && !a.isPropagationStopped()) {
          a.currentTarget = f.elem, c = 0;while ((g = f.handlers[c++]) && !a.isImmediatePropagationStopped()) {
            a.rnamespace && !a.rnamespace.test(g.namespace) || (a.handleObj = g, a.data = g.data, d = ((n.event.special[g.origType] || {}).handle || g.handler).apply(f.elem, i), void 0 !== d && (a.result = d) === !1 && (a.preventDefault(), a.stopPropagation()));
          }
        }return k.postDispatch && k.postDispatch.call(this, a), a.result;
      }
    }, handlers: function (a, b) {
      var c,
          d,
          e,
          f,
          g = [],
          h = b.delegateCount,
          i = a.target;if (h && i.nodeType && ("click" !== a.type || isNaN(a.button) || a.button < 1)) for (; i !== this; i = i.parentNode || this) {
        if (1 === i.nodeType && (i.disabled !== !0 || "click" !== a.type)) {
          for (d = [], c = 0; h > c; c++) {
            f = b[c], e = f.selector + " ", void 0 === d[e] && (d[e] = f.needsContext ? n(e, this).index(i) > -1 : n.find(e, this, null, [i]).length), d[e] && d.push(f);
          }d.length && g.push({ elem: i, handlers: d });
        }
      }return h < b.length && g.push({ elem: this, handlers: b.slice(h) }), g;
    }, props: "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "), fixHooks: {}, keyHooks: { props: "char charCode key keyCode".split(" "), filter: function (a, b) {
        return null == a.which && (a.which = null != b.charCode ? b.charCode : b.keyCode), a;
      } }, mouseHooks: { props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "), filter: function (a, b) {
        var c,
            e,
            f,
            g = b.button;return null == a.pageX && null != b.clientX && (c = a.target.ownerDocument || d, e = c.documentElement, f = c.body, a.pageX = b.clientX + (e && e.scrollLeft || f && f.scrollLeft || 0) - (e && e.clientLeft || f && f.clientLeft || 0), a.pageY = b.clientY + (e && e.scrollTop || f && f.scrollTop || 0) - (e && e.clientTop || f && f.clientTop || 0)), a.which || void 0 === g || (a.which = 1 & g ? 1 : 2 & g ? 3 : 4 & g ? 2 : 0), a;
      } }, fix: function (a) {
      if (a[n.expando]) return a;var b,
          c,
          e,
          f = a.type,
          g = a,
          h = this.fixHooks[f];h || (this.fixHooks[f] = h = ea.test(f) ? this.mouseHooks : da.test(f) ? this.keyHooks : {}), e = h.props ? this.props.concat(h.props) : this.props, a = new n.Event(g), b = e.length;while (b--) {
        c = e[b], a[c] = g[c];
      }return a.target || (a.target = d), 3 === a.target.nodeType && (a.target = a.target.parentNode), h.filter ? h.filter(a, g) : a;
    }, special: { load: { noBubble: !0 }, focus: { trigger: function () {
          return this !== ia() && this.focus ? (this.focus(), !1) : void 0;
        }, delegateType: "focusin" }, blur: { trigger: function () {
          return this === ia() && this.blur ? (this.blur(), !1) : void 0;
        }, delegateType: "focusout" }, click: { trigger: function () {
          return "checkbox" === this.type && this.click && n.nodeName(this, "input") ? (this.click(), !1) : void 0;
        }, _default: function (a) {
          return n.nodeName(a.target, "a");
        } }, beforeunload: { postDispatch: function (a) {
          void 0 !== a.result && a.originalEvent && (a.originalEvent.returnValue = a.result);
        } } } }, n.removeEvent = function (a, b, c) {
    a.removeEventListener && a.removeEventListener(b, c);
  }, n.Event = function (a, b) {
    return this instanceof n.Event ? (a && a.type ? (this.originalEvent = a, this.type = a.type, this.isDefaultPrevented = a.defaultPrevented || void 0 === a.defaultPrevented && a.returnValue === !1 ? ga : ha) : this.type = a, b && n.extend(this, b), this.timeStamp = a && a.timeStamp || n.now(), void (this[n.expando] = !0)) : new n.Event(a, b);
  }, n.Event.prototype = { constructor: n.Event, isDefaultPrevented: ha, isPropagationStopped: ha, isImmediatePropagationStopped: ha, isSimulated: !1, preventDefault: function () {
      var a = this.originalEvent;this.isDefaultPrevented = ga, a && !this.isSimulated && a.preventDefault();
    }, stopPropagation: function () {
      var a = this.originalEvent;this.isPropagationStopped = ga, a && !this.isSimulated && a.stopPropagation();
    }, stopImmediatePropagation: function () {
      var a = this.originalEvent;this.isImmediatePropagationStopped = ga, a && !this.isSimulated && a.stopImmediatePropagation(), this.stopPropagation();
    } }, n.each({ mouseenter: "mouseover", mouseleave: "mouseout", pointerenter: "pointerover", pointerleave: "pointerout" }, function (a, b) {
    n.event.special[a] = { delegateType: b, bindType: b, handle: function (a) {
        var c,
            d = this,
            e = a.relatedTarget,
            f = a.handleObj;return e && (e === d || n.contains(d, e)) || (a.type = f.origType, c = f.handler.apply(this, arguments), a.type = b), c;
      } };
  }), n.fn.extend({ on: function (a, b, c, d) {
      return ja(this, a, b, c, d);
    }, one: function (a, b, c, d) {
      return ja(this, a, b, c, d, 1);
    }, off: function (a, b, c) {
      var d, e;if (a && a.preventDefault && a.handleObj) return d = a.handleObj, n(a.delegateTarget).off(d.namespace ? d.origType + "." + d.namespace : d.origType, d.selector, d.handler), this;if ("object" == typeof a) {
        for (e in a) {
          this.off(e, b, a[e]);
        }return this;
      }return b !== !1 && "function" != typeof b || (c = b, b = void 0), c === !1 && (c = ha), this.each(function () {
        n.event.remove(this, a, c, b);
      });
    } });var ka = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,
      la = /<script|<style|<link/i,
      ma = /checked\s*(?:[^=]|=\s*.checked.)/i,
      na = /^true\/(.*)/,
      oa = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;function pa(a, b) {
    return n.nodeName(a, "table") && n.nodeName(11 !== b.nodeType ? b : b.firstChild, "tr") ? a.getElementsByTagName("tbody")[0] || a.appendChild(a.ownerDocument.createElement("tbody")) : a;
  }function qa(a) {
    return a.type = (null !== a.getAttribute("type")) + "/" + a.type, a;
  }function ra(a) {
    var b = na.exec(a.type);return b ? a.type = b[1] : a.removeAttribute("type"), a;
  }function sa(a, b) {
    var c, d, e, f, g, h, i, j;if (1 === b.nodeType) {
      if (N.hasData(a) && (f = N.access(a), g = N.set(b, f), j = f.events)) {
        delete g.handle, g.events = {};for (e in j) {
          for (c = 0, d = j[e].length; d > c; c++) {
            n.event.add(b, e, j[e][c]);
          }
        }
      }O.hasData(a) && (h = O.access(a), i = n.extend({}, h), O.set(b, i));
    }
  }function ta(a, b) {
    var c = b.nodeName.toLowerCase();"input" === c && X.test(a.type) ? b.checked = a.checked : "input" !== c && "textarea" !== c || (b.defaultValue = a.defaultValue);
  }function ua(a, b, c, d) {
    b = f.apply([], b);var e,
        g,
        h,
        i,
        j,
        k,
        m = 0,
        o = a.length,
        p = o - 1,
        q = b[0],
        r = n.isFunction(q);if (r || o > 1 && "string" == typeof q && !l.checkClone && ma.test(q)) return a.each(function (e) {
      var f = a.eq(e);r && (b[0] = q.call(this, e, f.html())), ua(f, b, c, d);
    });if (o && (e = ca(b, a[0].ownerDocument, !1, a, d), g = e.firstChild, 1 === e.childNodes.length && (e = g), g || d)) {
      for (h = n.map(_(e, "script"), qa), i = h.length; o > m; m++) {
        j = e, m !== p && (j = n.clone(j, !0, !0), i && n.merge(h, _(j, "script"))), c.call(a[m], j, m);
      }if (i) for (k = h[h.length - 1].ownerDocument, n.map(h, ra), m = 0; i > m; m++) {
        j = h[m], Z.test(j.type || "") && !N.access(j, "globalEval") && n.contains(k, j) && (j.src ? n._evalUrl && n._evalUrl(j.src) : n.globalEval(j.textContent.replace(oa, "")));
      }
    }return a;
  }function va(a, b, c) {
    for (var d, e = b ? n.filter(b, a) : a, f = 0; null != (d = e[f]); f++) {
      c || 1 !== d.nodeType || n.cleanData(_(d)), d.parentNode && (c && n.contains(d.ownerDocument, d) && aa(_(d, "script")), d.parentNode.removeChild(d));
    }return a;
  }n.extend({ htmlPrefilter: function (a) {
      return a.replace(ka, "<$1></$2>");
    }, clone: function (a, b, c) {
      var d,
          e,
          f,
          g,
          h = a.cloneNode(!0),
          i = n.contains(a.ownerDocument, a);if (!(l.noCloneChecked || 1 !== a.nodeType && 11 !== a.nodeType || n.isXMLDoc(a))) for (g = _(h), f = _(a), d = 0, e = f.length; e > d; d++) {
        ta(f[d], g[d]);
      }if (b) if (c) for (f = f || _(a), g = g || _(h), d = 0, e = f.length; e > d; d++) {
        sa(f[d], g[d]);
      } else sa(a, h);return g = _(h, "script"), g.length > 0 && aa(g, !i && _(a, "script")), h;
    }, cleanData: function (a) {
      for (var b, c, d, e = n.event.special, f = 0; void 0 !== (c = a[f]); f++) {
        if (L(c)) {
          if (b = c[N.expando]) {
            if (b.events) for (d in b.events) {
              e[d] ? n.event.remove(c, d) : n.removeEvent(c, d, b.handle);
            }c[N.expando] = void 0;
          }c[O.expando] && (c[O.expando] = void 0);
        }
      }
    } }), n.fn.extend({ domManip: ua, detach: function (a) {
      return va(this, a, !0);
    }, remove: function (a) {
      return va(this, a);
    }, text: function (a) {
      return K(this, function (a) {
        return void 0 === a ? n.text(this) : this.empty().each(function () {
          1 !== this.nodeType && 11 !== this.nodeType && 9 !== this.nodeType || (this.textContent = a);
        });
      }, null, a, arguments.length);
    }, append: function () {
      return ua(this, arguments, function (a) {
        if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
          var b = pa(this, a);b.appendChild(a);
        }
      });
    }, prepend: function () {
      return ua(this, arguments, function (a) {
        if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
          var b = pa(this, a);b.insertBefore(a, b.firstChild);
        }
      });
    }, before: function () {
      return ua(this, arguments, function (a) {
        this.parentNode && this.parentNode.insertBefore(a, this);
      });
    }, after: function () {
      return ua(this, arguments, function (a) {
        this.parentNode && this.parentNode.insertBefore(a, this.nextSibling);
      });
    }, empty: function () {
      for (var a, b = 0; null != (a = this[b]); b++) {
        1 === a.nodeType && (n.cleanData(_(a, !1)), a.textContent = "");
      }return this;
    }, clone: function (a, b) {
      return a = null == a ? !1 : a, b = null == b ? a : b, this.map(function () {
        return n.clone(this, a, b);
      });
    }, html: function (a) {
      return K(this, function (a) {
        var b = this[0] || {},
            c = 0,
            d = this.length;if (void 0 === a && 1 === b.nodeType) return b.innerHTML;if ("string" == typeof a && !la.test(a) && !$[(Y.exec(a) || ["", ""])[1].toLowerCase()]) {
          a = n.htmlPrefilter(a);try {
            for (; d > c; c++) {
              b = this[c] || {}, 1 === b.nodeType && (n.cleanData(_(b, !1)), b.innerHTML = a);
            }b = 0;
          } catch (e) {}
        }b && this.empty().append(a);
      }, null, a, arguments.length);
    }, replaceWith: function () {
      var a = [];return ua(this, arguments, function (b) {
        var c = this.parentNode;n.inArray(this, a) < 0 && (n.cleanData(_(this)), c && c.replaceChild(b, this));
      }, a);
    } }), n.each({ appendTo: "append", prependTo: "prepend", insertBefore: "before", insertAfter: "after", replaceAll: "replaceWith" }, function (a, b) {
    n.fn[a] = function (a) {
      for (var c, d = [], e = n(a), f = e.length - 1, h = 0; f >= h; h++) {
        c = h === f ? this : this.clone(!0), n(e[h])[b](c), g.apply(d, c.get());
      }return this.pushStack(d);
    };
  });var wa,
      xa = { HTML: "block", BODY: "block" };function ya(a, b) {
    var c = n(b.createElement(a)).appendTo(b.body),
        d = n.css(c[0], "display");return c.detach(), d;
  }function za(a) {
    var b = d,
        c = xa[a];return c || (c = ya(a, b), "none" !== c && c || (wa = (wa || n("<iframe frameborder='0' width='0' height='0'/>")).appendTo(b.documentElement), b = wa[0].contentDocument, b.write(), b.close(), c = ya(a, b), wa.detach()), xa[a] = c), c;
  }var Aa = /^margin/,
      Ba = new RegExp("^(" + S + ")(?!px)[a-z%]+$", "i"),
      Ca = function (b) {
    var c = b.ownerDocument.defaultView;return c && c.opener || (c = a), c.getComputedStyle(b);
  },
      Da = function (a, b, c, d) {
    var e,
        f,
        g = {};for (f in b) {
      g[f] = a.style[f], a.style[f] = b[f];
    }e = c.apply(a, d || []);for (f in b) {
      a.style[f] = g[f];
    }return e;
  },
      Ea = d.documentElement;!function () {
    var b,
        c,
        e,
        f,
        g = d.createElement("div"),
        h = d.createElement("div");if (h.style) {
      var _i = function () {
        h.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%", h.innerHTML = "", Ea.appendChild(g);var d = a.getComputedStyle(h);b = "1%" !== d.top, f = "2px" === d.marginLeft, c = "4px" === d.width, h.style.marginRight = "50%", e = "4px" === d.marginRight, Ea.removeChild(g);
      };

      h.style.backgroundClip = "content-box", h.cloneNode(!0).style.backgroundClip = "", l.clearCloneStyle = "content-box" === h.style.backgroundClip, g.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute", g.appendChild(h);n.extend(l, { pixelPosition: function () {
          return _i(), b;
        }, boxSizingReliable: function () {
          return null == c && _i(), c;
        }, pixelMarginRight: function () {
          return null == c && _i(), e;
        }, reliableMarginLeft: function () {
          return null == c && _i(), f;
        }, reliableMarginRight: function () {
          var b,
              c = h.appendChild(d.createElement("div"));return c.style.cssText = h.style.cssText = "-webkit-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0", c.style.marginRight = c.style.width = "0", h.style.width = "1px", Ea.appendChild(g), b = !parseFloat(a.getComputedStyle(c).marginRight), Ea.removeChild(g), h.removeChild(c), b;
        } });
    }
  }();function Fa(a, b, c) {
    var d,
        e,
        f,
        g,
        h = a.style;return c = c || Ca(a), g = c ? c.getPropertyValue(b) || c[b] : void 0, "" !== g && void 0 !== g || n.contains(a.ownerDocument, a) || (g = n.style(a, b)), c && !l.pixelMarginRight() && Ba.test(g) && Aa.test(b) && (d = h.width, e = h.minWidth, f = h.maxWidth, h.minWidth = h.maxWidth = h.width = g, g = c.width, h.width = d, h.minWidth = e, h.maxWidth = f), void 0 !== g ? g + "" : g;
  }function Ga(a, b) {
    return { get: function () {
        return a() ? void delete this.get : (this.get = b).apply(this, arguments);
      } };
  }var Ha = /^(none|table(?!-c[ea]).+)/,
      Ia = { position: "absolute", visibility: "hidden", display: "block" },
      Ja = { letterSpacing: "0", fontWeight: "400" },
      Ka = ["Webkit", "O", "Moz", "ms"],
      La = d.createElement("div").style;function Ma(a) {
    if (a in La) return a;var b = a[0].toUpperCase() + a.slice(1),
        c = Ka.length;while (c--) {
      if (a = Ka[c] + b, a in La) return a;
    }
  }function Na(a, b, c) {
    var d = T.exec(b);return d ? Math.max(0, d[2] - (c || 0)) + (d[3] || "px") : b;
  }function Oa(a, b, c, d, e) {
    for (var f = c === (d ? "border" : "content") ? 4 : "width" === b ? 1 : 0, g = 0; 4 > f; f += 2) {
      "margin" === c && (g += n.css(a, c + U[f], !0, e)), d ? ("content" === c && (g -= n.css(a, "padding" + U[f], !0, e)), "margin" !== c && (g -= n.css(a, "border" + U[f] + "Width", !0, e))) : (g += n.css(a, "padding" + U[f], !0, e), "padding" !== c && (g += n.css(a, "border" + U[f] + "Width", !0, e)));
    }return g;
  }function Pa(a, b, c) {
    var d = !0,
        e = "width" === b ? a.offsetWidth : a.offsetHeight,
        f = Ca(a),
        g = "border-box" === n.css(a, "boxSizing", !1, f);if (0 >= e || null == e) {
      if (e = Fa(a, b, f), (0 > e || null == e) && (e = a.style[b]), Ba.test(e)) return e;d = g && (l.boxSizingReliable() || e === a.style[b]), e = parseFloat(e) || 0;
    }return e + Oa(a, b, c || (g ? "border" : "content"), d, f) + "px";
  }function Qa(a, b) {
    for (var c, d, e, f = [], g = 0, h = a.length; h > g; g++) {
      d = a[g], d.style && (f[g] = N.get(d, "olddisplay"), c = d.style.display, b ? (f[g] || "none" !== c || (d.style.display = ""), "" === d.style.display && V(d) && (f[g] = N.access(d, "olddisplay", za(d.nodeName)))) : (e = V(d), "none" === c && e || N.set(d, "olddisplay", e ? c : n.css(d, "display"))));
    }for (g = 0; h > g; g++) {
      d = a[g], d.style && (b && "none" !== d.style.display && "" !== d.style.display || (d.style.display = b ? f[g] || "" : "none"));
    }return a;
  }n.extend({ cssHooks: { opacity: { get: function (a, b) {
          if (b) {
            var c = Fa(a, "opacity");return "" === c ? "1" : c;
          }
        } } }, cssNumber: { animationIterationCount: !0, columnCount: !0, fillOpacity: !0, flexGrow: !0, flexShrink: !0, fontWeight: !0, lineHeight: !0, opacity: !0, order: !0, orphans: !0, widows: !0, zIndex: !0, zoom: !0 }, cssProps: { "float": "cssFloat" }, style: function (a, b, c, d) {
      if (a && 3 !== a.nodeType && 8 !== a.nodeType && a.style) {
        var e,
            f,
            g,
            h = n.camelCase(b),
            i = a.style;return b = n.cssProps[h] || (n.cssProps[h] = Ma(h) || h), g = n.cssHooks[b] || n.cssHooks[h], void 0 === c ? g && "get" in g && void 0 !== (e = g.get(a, !1, d)) ? e : i[b] : (f = typeof c, "string" === f && (e = T.exec(c)) && e[1] && (c = W(a, b, e), f = "number"), null != c && c === c && ("number" === f && (c += e && e[3] || (n.cssNumber[h] ? "" : "px")), l.clearCloneStyle || "" !== c || 0 !== b.indexOf("background") || (i[b] = "inherit"), g && "set" in g && void 0 === (c = g.set(a, c, d)) || (i[b] = c)), void 0);
      }
    }, css: function (a, b, c, d) {
      var e,
          f,
          g,
          h = n.camelCase(b);return b = n.cssProps[h] || (n.cssProps[h] = Ma(h) || h), g = n.cssHooks[b] || n.cssHooks[h], g && "get" in g && (e = g.get(a, !0, c)), void 0 === e && (e = Fa(a, b, d)), "normal" === e && b in Ja && (e = Ja[b]), "" === c || c ? (f = parseFloat(e), c === !0 || isFinite(f) ? f || 0 : e) : e;
    } }), n.each(["height", "width"], function (a, b) {
    n.cssHooks[b] = { get: function (a, c, d) {
        return c ? Ha.test(n.css(a, "display")) && 0 === a.offsetWidth ? Da(a, Ia, function () {
          return Pa(a, b, d);
        }) : Pa(a, b, d) : void 0;
      }, set: function (a, c, d) {
        var e,
            f = d && Ca(a),
            g = d && Oa(a, b, d, "border-box" === n.css(a, "boxSizing", !1, f), f);return g && (e = T.exec(c)) && "px" !== (e[3] || "px") && (a.style[b] = c, c = n.css(a, b)), Na(a, c, g);
      } };
  }), n.cssHooks.marginLeft = Ga(l.reliableMarginLeft, function (a, b) {
    return b ? (parseFloat(Fa(a, "marginLeft")) || a.getBoundingClientRect().left - Da(a, { marginLeft: 0 }, function () {
      return a.getBoundingClientRect().left;
    })) + "px" : void 0;
  }), n.cssHooks.marginRight = Ga(l.reliableMarginRight, function (a, b) {
    return b ? Da(a, { display: "inline-block" }, Fa, [a, "marginRight"]) : void 0;
  }), n.each({ margin: "", padding: "", border: "Width" }, function (a, b) {
    n.cssHooks[a + b] = { expand: function (c) {
        for (var d = 0, e = {}, f = "string" == typeof c ? c.split(" ") : [c]; 4 > d; d++) {
          e[a + U[d] + b] = f[d] || f[d - 2] || f[0];
        }return e;
      } }, Aa.test(a) || (n.cssHooks[a + b].set = Na);
  }), n.fn.extend({ css: function (a, b) {
      return K(this, function (a, b, c) {
        var d,
            e,
            f = {},
            g = 0;if (n.isArray(b)) {
          for (d = Ca(a), e = b.length; e > g; g++) {
            f[b[g]] = n.css(a, b[g], !1, d);
          }return f;
        }return void 0 !== c ? n.style(a, b, c) : n.css(a, b);
      }, a, b, arguments.length > 1);
    }, show: function () {
      return Qa(this, !0);
    }, hide: function () {
      return Qa(this);
    }, toggle: function (a) {
      return "boolean" == typeof a ? a ? this.show() : this.hide() : this.each(function () {
        V(this) ? n(this).show() : n(this).hide();
      });
    } });function Ra(a, b, c, d, e) {
    return new Ra.prototype.init(a, b, c, d, e);
  }n.Tween = Ra, Ra.prototype = { constructor: Ra, init: function (a, b, c, d, e, f) {
      this.elem = a, this.prop = c, this.easing = e || n.easing._default, this.options = b, this.start = this.now = this.cur(), this.end = d, this.unit = f || (n.cssNumber[c] ? "" : "px");
    }, cur: function () {
      var a = Ra.propHooks[this.prop];return a && a.get ? a.get(this) : Ra.propHooks._default.get(this);
    }, run: function (a) {
      var b,
          c = Ra.propHooks[this.prop];return this.options.duration ? this.pos = b = n.easing[this.easing](a, this.options.duration * a, 0, 1, this.options.duration) : this.pos = b = a, this.now = (this.end - this.start) * b + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), c && c.set ? c.set(this) : Ra.propHooks._default.set(this), this;
    } }, Ra.prototype.init.prototype = Ra.prototype, Ra.propHooks = { _default: { get: function (a) {
        var b;return 1 !== a.elem.nodeType || null != a.elem[a.prop] && null == a.elem.style[a.prop] ? a.elem[a.prop] : (b = n.css(a.elem, a.prop, ""), b && "auto" !== b ? b : 0);
      }, set: function (a) {
        n.fx.step[a.prop] ? n.fx.step[a.prop](a) : 1 !== a.elem.nodeType || null == a.elem.style[n.cssProps[a.prop]] && !n.cssHooks[a.prop] ? a.elem[a.prop] = a.now : n.style(a.elem, a.prop, a.now + a.unit);
      } } }, Ra.propHooks.scrollTop = Ra.propHooks.scrollLeft = { set: function (a) {
      a.elem.nodeType && a.elem.parentNode && (a.elem[a.prop] = a.now);
    } }, n.easing = { linear: function (a) {
      return a;
    }, swing: function (a) {
      return .5 - Math.cos(a * Math.PI) / 2;
    }, _default: "swing" }, n.fx = Ra.prototype.init, n.fx.step = {};var Sa,
      Ta,
      Ua = /^(?:toggle|show|hide)$/,
      Va = /queueHooks$/;function Wa() {
    return a.setTimeout(function () {
      Sa = void 0;
    }), Sa = n.now();
  }function Xa(a, b) {
    var c,
        d = 0,
        e = { height: a };for (b = b ? 1 : 0; 4 > d; d += 2 - b) {
      c = U[d], e["margin" + c] = e["padding" + c] = a;
    }return b && (e.opacity = e.width = a), e;
  }function Ya(a, b, c) {
    for (var d, e = (_a.tweeners[b] || []).concat(_a.tweeners["*"]), f = 0, g = e.length; g > f; f++) {
      if (d = e[f].call(c, b, a)) return d;
    }
  }function Za(a, b, c) {
    var d,
        e,
        f,
        g,
        h,
        i,
        j,
        k,
        l = this,
        m = {},
        o = a.style,
        p = a.nodeType && V(a),
        q = N.get(a, "fxshow");c.queue || (h = n._queueHooks(a, "fx"), null == h.unqueued && (h.unqueued = 0, i = h.empty.fire, h.empty.fire = function () {
      h.unqueued || i();
    }), h.unqueued++, l.always(function () {
      l.always(function () {
        h.unqueued--, n.queue(a, "fx").length || h.empty.fire();
      });
    })), 1 === a.nodeType && ("height" in b || "width" in b) && (c.overflow = [o.overflow, o.overflowX, o.overflowY], j = n.css(a, "display"), k = "none" === j ? N.get(a, "olddisplay") || za(a.nodeName) : j, "inline" === k && "none" === n.css(a, "float") && (o.display = "inline-block")), c.overflow && (o.overflow = "hidden", l.always(function () {
      o.overflow = c.overflow[0], o.overflowX = c.overflow[1], o.overflowY = c.overflow[2];
    }));for (d in b) {
      if (e = b[d], Ua.exec(e)) {
        if (delete b[d], f = f || "toggle" === e, e === (p ? "hide" : "show")) {
          if ("show" !== e || !q || void 0 === q[d]) continue;p = !0;
        }m[d] = q && q[d] || n.style(a, d);
      } else j = void 0;
    }if (n.isEmptyObject(m)) "inline" === ("none" === j ? za(a.nodeName) : j) && (o.display = j);else {
      q ? "hidden" in q && (p = q.hidden) : q = N.access(a, "fxshow", {}), f && (q.hidden = !p), p ? n(a).show() : l.done(function () {
        n(a).hide();
      }), l.done(function () {
        var b;N.remove(a, "fxshow");for (b in m) {
          n.style(a, b, m[b]);
        }
      });for (d in m) {
        g = Ya(p ? q[d] : 0, d, l), d in q || (q[d] = g.start, p && (g.end = g.start, g.start = "width" === d || "height" === d ? 1 : 0));
      }
    }
  }function $a(a, b) {
    var c, d, e, f, g;for (c in a) {
      if (d = n.camelCase(c), e = b[d], f = a[c], n.isArray(f) && (e = f[1], f = a[c] = f[0]), c !== d && (a[d] = f, delete a[c]), g = n.cssHooks[d], g && "expand" in g) {
        f = g.expand(f), delete a[d];for (c in f) {
          c in a || (a[c] = f[c], b[c] = e);
        }
      } else b[d] = e;
    }
  }function _a(a, b, c) {
    var d,
        e,
        f = 0,
        g = _a.prefilters.length,
        h = n.Deferred().always(function () {
      delete i.elem;
    }),
        i = function () {
      if (e) return !1;for (var b = Sa || Wa(), c = Math.max(0, j.startTime + j.duration - b), d = c / j.duration || 0, f = 1 - d, g = 0, i = j.tweens.length; i > g; g++) {
        j.tweens[g].run(f);
      }return h.notifyWith(a, [j, f, c]), 1 > f && i ? c : (h.resolveWith(a, [j]), !1);
    },
        j = h.promise({ elem: a, props: n.extend({}, b), opts: n.extend(!0, { specialEasing: {}, easing: n.easing._default }, c), originalProperties: b, originalOptions: c, startTime: Sa || Wa(), duration: c.duration, tweens: [], createTween: function (b, c) {
        var d = n.Tween(a, j.opts, b, c, j.opts.specialEasing[b] || j.opts.easing);return j.tweens.push(d), d;
      }, stop: function (b) {
        var c = 0,
            d = b ? j.tweens.length : 0;if (e) return this;for (e = !0; d > c; c++) {
          j.tweens[c].run(1);
        }return b ? (h.notifyWith(a, [j, 1, 0]), h.resolveWith(a, [j, b])) : h.rejectWith(a, [j, b]), this;
      } }),
        k = j.props;for ($a(k, j.opts.specialEasing); g > f; f++) {
      if (d = _a.prefilters[f].call(j, a, k, j.opts)) return n.isFunction(d.stop) && (n._queueHooks(j.elem, j.opts.queue).stop = n.proxy(d.stop, d)), d;
    }return n.map(k, Ya, j), n.isFunction(j.opts.start) && j.opts.start.call(a, j), n.fx.timer(n.extend(i, { elem: a, anim: j, queue: j.opts.queue })), j.progress(j.opts.progress).done(j.opts.done, j.opts.complete).fail(j.opts.fail).always(j.opts.always);
  }n.Animation = n.extend(_a, { tweeners: { "*": [function (a, b) {
        var c = this.createTween(a, b);return W(c.elem, a, T.exec(b), c), c;
      }] }, tweener: function (a, b) {
      n.isFunction(a) ? (b = a, a = ["*"]) : a = a.match(G);for (var c, d = 0, e = a.length; e > d; d++) {
        c = a[d], _a.tweeners[c] = _a.tweeners[c] || [], _a.tweeners[c].unshift(b);
      }
    }, prefilters: [Za], prefilter: function (a, b) {
      b ? _a.prefilters.unshift(a) : _a.prefilters.push(a);
    } }), n.speed = function (a, b, c) {
    var d = a && "object" == typeof a ? n.extend({}, a) : { complete: c || !c && b || n.isFunction(a) && a, duration: a, easing: c && b || b && !n.isFunction(b) && b };return d.duration = n.fx.off ? 0 : "number" == typeof d.duration ? d.duration : d.duration in n.fx.speeds ? n.fx.speeds[d.duration] : n.fx.speeds._default, null != d.queue && d.queue !== !0 || (d.queue = "fx"), d.old = d.complete, d.complete = function () {
      n.isFunction(d.old) && d.old.call(this), d.queue && n.dequeue(this, d.queue);
    }, d;
  }, n.fn.extend({ fadeTo: function (a, b, c, d) {
      return this.filter(V).css("opacity", 0).show().end().animate({ opacity: b }, a, c, d);
    }, animate: function (a, b, c, d) {
      var e = n.isEmptyObject(a),
          f = n.speed(b, c, d),
          g = function () {
        var b = _a(this, n.extend({}, a), f);(e || N.get(this, "finish")) && b.stop(!0);
      };return g.finish = g, e || f.queue === !1 ? this.each(g) : this.queue(f.queue, g);
    }, stop: function (a, b, c) {
      var d = function (a) {
        var b = a.stop;delete a.stop, b(c);
      };return "string" != typeof a && (c = b, b = a, a = void 0), b && a !== !1 && this.queue(a || "fx", []), this.each(function () {
        var b = !0,
            e = null != a && a + "queueHooks",
            f = n.timers,
            g = N.get(this);if (e) g[e] && g[e].stop && d(g[e]);else for (e in g) {
          g[e] && g[e].stop && Va.test(e) && d(g[e]);
        }for (e = f.length; e--;) {
          f[e].elem !== this || null != a && f[e].queue !== a || (f[e].anim.stop(c), b = !1, f.splice(e, 1));
        }!b && c || n.dequeue(this, a);
      });
    }, finish: function (a) {
      return a !== !1 && (a = a || "fx"), this.each(function () {
        var b,
            c = N.get(this),
            d = c[a + "queue"],
            e = c[a + "queueHooks"],
            f = n.timers,
            g = d ? d.length : 0;for (c.finish = !0, n.queue(this, a, []), e && e.stop && e.stop.call(this, !0), b = f.length; b--;) {
          f[b].elem === this && f[b].queue === a && (f[b].anim.stop(!0), f.splice(b, 1));
        }for (b = 0; g > b; b++) {
          d[b] && d[b].finish && d[b].finish.call(this);
        }delete c.finish;
      });
    } }), n.each(["toggle", "show", "hide"], function (a, b) {
    var c = n.fn[b];n.fn[b] = function (a, d, e) {
      return null == a || "boolean" == typeof a ? c.apply(this, arguments) : this.animate(Xa(b, !0), a, d, e);
    };
  }), n.each({ slideDown: Xa("show"), slideUp: Xa("hide"), slideToggle: Xa("toggle"), fadeIn: { opacity: "show" }, fadeOut: { opacity: "hide" }, fadeToggle: { opacity: "toggle" } }, function (a, b) {
    n.fn[a] = function (a, c, d) {
      return this.animate(b, a, c, d);
    };
  }), n.timers = [], n.fx.tick = function () {
    var a,
        b = 0,
        c = n.timers;for (Sa = n.now(); b < c.length; b++) {
      a = c[b], a() || c[b] !== a || c.splice(b--, 1);
    }c.length || n.fx.stop(), Sa = void 0;
  }, n.fx.timer = function (a) {
    n.timers.push(a), a() ? n.fx.start() : n.timers.pop();
  }, n.fx.interval = 13, n.fx.start = function () {
    Ta || (Ta = a.setInterval(n.fx.tick, n.fx.interval));
  }, n.fx.stop = function () {
    a.clearInterval(Ta), Ta = null;
  }, n.fx.speeds = { slow: 600, fast: 200, _default: 400 }, n.fn.delay = function (b, c) {
    return b = n.fx ? n.fx.speeds[b] || b : b, c = c || "fx", this.queue(c, function (c, d) {
      var e = a.setTimeout(c, b);d.stop = function () {
        a.clearTimeout(e);
      };
    });
  }, function () {
    var a = d.createElement("input"),
        b = d.createElement("select"),
        c = b.appendChild(d.createElement("option"));a.type = "checkbox", l.checkOn = "" !== a.value, l.optSelected = c.selected, b.disabled = !0, l.optDisabled = !c.disabled, a = d.createElement("input"), a.value = "t", a.type = "radio", l.radioValue = "t" === a.value;
  }();var ab,
      bb = n.expr.attrHandle;n.fn.extend({ attr: function (a, b) {
      return K(this, n.attr, a, b, arguments.length > 1);
    }, removeAttr: function (a) {
      return this.each(function () {
        n.removeAttr(this, a);
      });
    } }), n.extend({ attr: function (a, b, c) {
      var d,
          e,
          f = a.nodeType;if (3 !== f && 8 !== f && 2 !== f) return "undefined" == typeof a.getAttribute ? n.prop(a, b, c) : (1 === f && n.isXMLDoc(a) || (b = b.toLowerCase(), e = n.attrHooks[b] || (n.expr.match.bool.test(b) ? ab : void 0)), void 0 !== c ? null === c ? void n.removeAttr(a, b) : e && "set" in e && void 0 !== (d = e.set(a, c, b)) ? d : (a.setAttribute(b, c + ""), c) : e && "get" in e && null !== (d = e.get(a, b)) ? d : (d = n.find.attr(a, b), null == d ? void 0 : d));
    }, attrHooks: { type: { set: function (a, b) {
          if (!l.radioValue && "radio" === b && n.nodeName(a, "input")) {
            var c = a.value;return a.setAttribute("type", b), c && (a.value = c), b;
          }
        } } }, removeAttr: function (a, b) {
      var c,
          d,
          e = 0,
          f = b && b.match(G);if (f && 1 === a.nodeType) while (c = f[e++]) {
        d = n.propFix[c] || c, n.expr.match.bool.test(c) && (a[d] = !1), a.removeAttribute(c);
      }
    } }), ab = { set: function (a, b, c) {
      return b === !1 ? n.removeAttr(a, c) : a.setAttribute(c, c), c;
    } }, n.each(n.expr.match.bool.source.match(/\w+/g), function (a, b) {
    var c = bb[b] || n.find.attr;bb[b] = function (a, b, d) {
      var e, f;return d || (f = bb[b], bb[b] = e, e = null != c(a, b, d) ? b.toLowerCase() : null, bb[b] = f), e;
    };
  });var cb = /^(?:input|select|textarea|button)$/i,
      db = /^(?:a|area)$/i;n.fn.extend({ prop: function (a, b) {
      return K(this, n.prop, a, b, arguments.length > 1);
    }, removeProp: function (a) {
      return this.each(function () {
        delete this[n.propFix[a] || a];
      });
    } }), n.extend({ prop: function (a, b, c) {
      var d,
          e,
          f = a.nodeType;if (3 !== f && 8 !== f && 2 !== f) return 1 === f && n.isXMLDoc(a) || (b = n.propFix[b] || b, e = n.propHooks[b]), void 0 !== c ? e && "set" in e && void 0 !== (d = e.set(a, c, b)) ? d : a[b] = c : e && "get" in e && null !== (d = e.get(a, b)) ? d : a[b];
    }, propHooks: { tabIndex: { get: function (a) {
          var b = n.find.attr(a, "tabindex");return b ? parseInt(b, 10) : cb.test(a.nodeName) || db.test(a.nodeName) && a.href ? 0 : -1;
        } } }, propFix: { "for": "htmlFor", "class": "className" } }), l.optSelected || (n.propHooks.selected = { get: function (a) {
      var b = a.parentNode;return b && b.parentNode && b.parentNode.selectedIndex, null;
    }, set: function (a) {
      var b = a.parentNode;b && (b.selectedIndex, b.parentNode && b.parentNode.selectedIndex);
    } }), n.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function () {
    n.propFix[this.toLowerCase()] = this;
  });var eb = /[\t\r\n\f]/g;function fb(a) {
    return a.getAttribute && a.getAttribute("class") || "";
  }n.fn.extend({ addClass: function (a) {
      var b,
          c,
          d,
          e,
          f,
          g,
          h,
          i = 0;if (n.isFunction(a)) return this.each(function (b) {
        n(this).addClass(a.call(this, b, fb(this)));
      });if ("string" == typeof a && a) {
        b = a.match(G) || [];while (c = this[i++]) {
          if (e = fb(c), d = 1 === c.nodeType && (" " + e + " ").replace(eb, " ")) {
            g = 0;while (f = b[g++]) {
              d.indexOf(" " + f + " ") < 0 && (d += f + " ");
            }h = n.trim(d), e !== h && c.setAttribute("class", h);
          }
        }
      }return this;
    }, removeClass: function (a) {
      var b,
          c,
          d,
          e,
          f,
          g,
          h,
          i = 0;if (n.isFunction(a)) return this.each(function (b) {
        n(this).removeClass(a.call(this, b, fb(this)));
      });if (!arguments.length) return this.attr("class", "");if ("string" == typeof a && a) {
        b = a.match(G) || [];while (c = this[i++]) {
          if (e = fb(c), d = 1 === c.nodeType && (" " + e + " ").replace(eb, " ")) {
            g = 0;while (f = b[g++]) {
              while (d.indexOf(" " + f + " ") > -1) {
                d = d.replace(" " + f + " ", " ");
              }
            }h = n.trim(d), e !== h && c.setAttribute("class", h);
          }
        }
      }return this;
    }, toggleClass: function (a, b) {
      var c = typeof a;return "boolean" == typeof b && "string" === c ? b ? this.addClass(a) : this.removeClass(a) : n.isFunction(a) ? this.each(function (c) {
        n(this).toggleClass(a.call(this, c, fb(this), b), b);
      }) : this.each(function () {
        var b, d, e, f;if ("string" === c) {
          d = 0, e = n(this), f = a.match(G) || [];while (b = f[d++]) {
            e.hasClass(b) ? e.removeClass(b) : e.addClass(b);
          }
        } else void 0 !== a && "boolean" !== c || (b = fb(this), b && N.set(this, "__className__", b), this.setAttribute && this.setAttribute("class", b || a === !1 ? "" : N.get(this, "__className__") || ""));
      });
    }, hasClass: function (a) {
      var b,
          c,
          d = 0;b = " " + a + " ";while (c = this[d++]) {
        if (1 === c.nodeType && (" " + fb(c) + " ").replace(eb, " ").indexOf(b) > -1) return !0;
      }return !1;
    } });var gb = /\r/g,
      hb = /[\x20\t\r\n\f]+/g;n.fn.extend({ val: function (a) {
      var b,
          c,
          d,
          e = this[0];{
        if (arguments.length) return d = n.isFunction(a), this.each(function (c) {
          var e;1 === this.nodeType && (e = d ? a.call(this, c, n(this).val()) : a, null == e ? e = "" : "number" == typeof e ? e += "" : n.isArray(e) && (e = n.map(e, function (a) {
            return null == a ? "" : a + "";
          })), b = n.valHooks[this.type] || n.valHooks[this.nodeName.toLowerCase()], b && "set" in b && void 0 !== b.set(this, e, "value") || (this.value = e));
        });if (e) return b = n.valHooks[e.type] || n.valHooks[e.nodeName.toLowerCase()], b && "get" in b && void 0 !== (c = b.get(e, "value")) ? c : (c = e.value, "string" == typeof c ? c.replace(gb, "") : null == c ? "" : c);
      }
    } }), n.extend({ valHooks: { option: { get: function (a) {
          var b = n.find.attr(a, "value");return null != b ? b : n.trim(n.text(a)).replace(hb, " ");
        } }, select: { get: function (a) {
          for (var b, c, d = a.options, e = a.selectedIndex, f = "select-one" === a.type || 0 > e, g = f ? null : [], h = f ? e + 1 : d.length, i = 0 > e ? h : f ? e : 0; h > i; i++) {
            if (c = d[i], (c.selected || i === e) && (l.optDisabled ? !c.disabled : null === c.getAttribute("disabled")) && (!c.parentNode.disabled || !n.nodeName(c.parentNode, "optgroup"))) {
              if (b = n(c).val(), f) return b;g.push(b);
            }
          }return g;
        }, set: function (a, b) {
          var c,
              d,
              e = a.options,
              f = n.makeArray(b),
              g = e.length;while (g--) {
            d = e[g], (d.selected = n.inArray(n.valHooks.option.get(d), f) > -1) && (c = !0);
          }return c || (a.selectedIndex = -1), f;
        } } } }), n.each(["radio", "checkbox"], function () {
    n.valHooks[this] = { set: function (a, b) {
        return n.isArray(b) ? a.checked = n.inArray(n(a).val(), b) > -1 : void 0;
      } }, l.checkOn || (n.valHooks[this].get = function (a) {
      return null === a.getAttribute("value") ? "on" : a.value;
    });
  });var ib = /^(?:focusinfocus|focusoutblur)$/;n.extend(n.event, { trigger: function (b, c, e, f) {
      var g,
          h,
          i,
          j,
          l,
          m,
          o,
          p = [e || d],
          q = k.call(b, "type") ? b.type : b,
          r = k.call(b, "namespace") ? b.namespace.split(".") : [];if (h = i = e = e || d, 3 !== e.nodeType && 8 !== e.nodeType && !ib.test(q + n.event.triggered) && (q.indexOf(".") > -1 && (r = q.split("."), q = r.shift(), r.sort()), l = q.indexOf(":") < 0 && "on" + q, b = b[n.expando] ? b : new n.Event(q, "object" == typeof b && b), b.isTrigger = f ? 2 : 3, b.namespace = r.join("."), b.rnamespace = b.namespace ? new RegExp("(^|\\.)" + r.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, b.result = void 0, b.target || (b.target = e), c = null == c ? [b] : n.makeArray(c, [b]), o = n.event.special[q] || {}, f || !o.trigger || o.trigger.apply(e, c) !== !1)) {
        if (!f && !o.noBubble && !n.isWindow(e)) {
          for (j = o.delegateType || q, ib.test(j + q) || (h = h.parentNode); h; h = h.parentNode) {
            p.push(h), i = h;
          }i === (e.ownerDocument || d) && p.push(i.defaultView || i.parentWindow || a);
        }g = 0;while ((h = p[g++]) && !b.isPropagationStopped()) {
          b.type = g > 1 ? j : o.bindType || q, m = (N.get(h, "events") || {})[b.type] && N.get(h, "handle"), m && m.apply(h, c), m = l && h[l], m && m.apply && L(h) && (b.result = m.apply(h, c), b.result === !1 && b.preventDefault());
        }return b.type = q, f || b.isDefaultPrevented() || o._default && o._default.apply(p.pop(), c) !== !1 || !L(e) || l && n.isFunction(e[q]) && !n.isWindow(e) && (i = e[l], i && (e[l] = null), n.event.triggered = q, e[q](), n.event.triggered = void 0, i && (e[l] = i)), b.result;
      }
    }, simulate: function (a, b, c) {
      var d = n.extend(new n.Event(), c, { type: a, isSimulated: !0 });n.event.trigger(d, null, b);
    } }), n.fn.extend({ trigger: function (a, b) {
      return this.each(function () {
        n.event.trigger(a, b, this);
      });
    }, triggerHandler: function (a, b) {
      var c = this[0];return c ? n.event.trigger(a, b, c, !0) : void 0;
    } }), n.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function (a, b) {
    n.fn[b] = function (a, c) {
      return arguments.length > 0 ? this.on(b, null, a, c) : this.trigger(b);
    };
  }), n.fn.extend({ hover: function (a, b) {
      return this.mouseenter(a).mouseleave(b || a);
    } }), l.focusin = "onfocusin" in a, l.focusin || n.each({ focus: "focusin", blur: "focusout" }, function (a, b) {
    var c = function (a) {
      n.event.simulate(b, a.target, n.event.fix(a));
    };n.event.special[b] = { setup: function () {
        var d = this.ownerDocument || this,
            e = N.access(d, b);e || d.addEventListener(a, c, !0), N.access(d, b, (e || 0) + 1);
      }, teardown: function () {
        var d = this.ownerDocument || this,
            e = N.access(d, b) - 1;e ? N.access(d, b, e) : (d.removeEventListener(a, c, !0), N.remove(d, b));
      } };
  });var jb = a.location,
      kb = n.now(),
      lb = /\?/;n.parseJSON = function (a) {
    return JSON.parse(a + "");
  }, n.parseXML = function (b) {
    var c;if (!b || "string" != typeof b) return null;try {
      c = new a.DOMParser().parseFromString(b, "text/xml");
    } catch (d) {
      c = void 0;
    }return c && !c.getElementsByTagName("parsererror").length || n.error("Invalid XML: " + b), c;
  };var mb = /#.*$/,
      nb = /([?&])_=[^&]*/,
      ob = /^(.*?):[ \t]*([^\r\n]*)$/gm,
      pb = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      qb = /^(?:GET|HEAD)$/,
      rb = /^\/\//,
      sb = {},
      tb = {},
      ub = "*/".concat("*"),
      vb = d.createElement("a");vb.href = jb.href;function wb(a) {
    return function (b, c) {
      "string" != typeof b && (c = b, b = "*");var d,
          e = 0,
          f = b.toLowerCase().match(G) || [];if (n.isFunction(c)) while (d = f[e++]) {
        "+" === d[0] ? (d = d.slice(1) || "*", (a[d] = a[d] || []).unshift(c)) : (a[d] = a[d] || []).push(c);
      }
    };
  }function xb(a, b, c, d) {
    var e = {},
        f = a === tb;function g(h) {
      var i;return e[h] = !0, n.each(a[h] || [], function (a, h) {
        var j = h(b, c, d);return "string" != typeof j || f || e[j] ? f ? !(i = j) : void 0 : (b.dataTypes.unshift(j), g(j), !1);
      }), i;
    }return g(b.dataTypes[0]) || !e["*"] && g("*");
  }function yb(a, b) {
    var c,
        d,
        e = n.ajaxSettings.flatOptions || {};for (c in b) {
      void 0 !== b[c] && ((e[c] ? a : d || (d = {}))[c] = b[c]);
    }return d && n.extend(!0, a, d), a;
  }function zb(a, b, c) {
    var d,
        e,
        f,
        g,
        h = a.contents,
        i = a.dataTypes;while ("*" === i[0]) {
      i.shift(), void 0 === d && (d = a.mimeType || b.getResponseHeader("Content-Type"));
    }if (d) for (e in h) {
      if (h[e] && h[e].test(d)) {
        i.unshift(e);break;
      }
    }if (i[0] in c) f = i[0];else {
      for (e in c) {
        if (!i[0] || a.converters[e + " " + i[0]]) {
          f = e;break;
        }g || (g = e);
      }f = f || g;
    }return f ? (f !== i[0] && i.unshift(f), c[f]) : void 0;
  }function Ab(a, b, c, d) {
    var e,
        f,
        g,
        h,
        i,
        j = {},
        k = a.dataTypes.slice();if (k[1]) for (g in a.converters) {
      j[g.toLowerCase()] = a.converters[g];
    }f = k.shift();while (f) {
      if (a.responseFields[f] && (c[a.responseFields[f]] = b), !i && d && a.dataFilter && (b = a.dataFilter(b, a.dataType)), i = f, f = k.shift()) if ("*" === f) f = i;else if ("*" !== i && i !== f) {
        if (g = j[i + " " + f] || j["* " + f], !g) for (e in j) {
          if (h = e.split(" "), h[1] === f && (g = j[i + " " + h[0]] || j["* " + h[0]])) {
            g === !0 ? g = j[e] : j[e] !== !0 && (f = h[0], k.unshift(h[1]));break;
          }
        }if (g !== !0) if (g && a["throws"]) b = g(b);else try {
          b = g(b);
        } catch (l) {
          return { state: "parsererror", error: g ? l : "No conversion from " + i + " to " + f };
        }
      }
    }return { state: "success", data: b };
  }n.extend({ active: 0, lastModified: {}, etag: {}, ajaxSettings: { url: jb.href, type: "GET", isLocal: pb.test(jb.protocol), global: !0, processData: !0, async: !0, contentType: "application/x-www-form-urlencoded; charset=UTF-8", accepts: { "*": ub, text: "text/plain", html: "text/html", xml: "application/xml, text/xml", json: "application/json, text/javascript" }, contents: { xml: /\bxml\b/, html: /\bhtml/, json: /\bjson\b/ }, responseFields: { xml: "responseXML", text: "responseText", json: "responseJSON" }, converters: { "* text": String, "text html": !0, "text json": n.parseJSON, "text xml": n.parseXML }, flatOptions: { url: !0, context: !0 } }, ajaxSetup: function (a, b) {
      return b ? yb(yb(a, n.ajaxSettings), b) : yb(n.ajaxSettings, a);
    }, ajaxPrefilter: wb(sb), ajaxTransport: wb(tb), ajax: function (b, c) {
      "object" == typeof b && (c = b, b = void 0), c = c || {};var e,
          f,
          g,
          h,
          i,
          j,
          k,
          l,
          m = n.ajaxSetup({}, c),
          o = m.context || m,
          p = m.context && (o.nodeType || o.jquery) ? n(o) : n.event,
          q = n.Deferred(),
          r = n.Callbacks("once memory"),
          s = m.statusCode || {},
          t = {},
          u = {},
          v = 0,
          w = "canceled",
          x = { readyState: 0, getResponseHeader: function (a) {
          var b;if (2 === v) {
            if (!h) {
              h = {};while (b = ob.exec(g)) {
                h[b[1].toLowerCase()] = b[2];
              }
            }b = h[a.toLowerCase()];
          }return null == b ? null : b;
        }, getAllResponseHeaders: function () {
          return 2 === v ? g : null;
        }, setRequestHeader: function (a, b) {
          var c = a.toLowerCase();return v || (a = u[c] = u[c] || a, t[a] = b), this;
        }, overrideMimeType: function (a) {
          return v || (m.mimeType = a), this;
        }, statusCode: function (a) {
          var b;if (a) if (2 > v) for (b in a) {
            s[b] = [s[b], a[b]];
          } else x.always(a[x.status]);return this;
        }, abort: function (a) {
          var b = a || w;return e && e.abort(b), z(0, b), this;
        } };if (q.promise(x).complete = r.add, x.success = x.done, x.error = x.fail, m.url = ((b || m.url || jb.href) + "").replace(mb, "").replace(rb, jb.protocol + "//"), m.type = c.method || c.type || m.method || m.type, m.dataTypes = n.trim(m.dataType || "*").toLowerCase().match(G) || [""], null == m.crossDomain) {
        j = d.createElement("a");try {
          j.href = m.url, j.href = j.href, m.crossDomain = vb.protocol + "//" + vb.host != j.protocol + "//" + j.host;
        } catch (y) {
          m.crossDomain = !0;
        }
      }if (m.data && m.processData && "string" != typeof m.data && (m.data = n.param(m.data, m.traditional)), xb(sb, m, c, x), 2 === v) return x;k = n.event && m.global, k && 0 === n.active++ && n.event.trigger("ajaxStart"), m.type = m.type.toUpperCase(), m.hasContent = !qb.test(m.type), f = m.url, m.hasContent || (m.data && (f = m.url += (lb.test(f) ? "&" : "?") + m.data, delete m.data), m.cache === !1 && (m.url = nb.test(f) ? f.replace(nb, "$1_=" + kb++) : f + (lb.test(f) ? "&" : "?") + "_=" + kb++)), m.ifModified && (n.lastModified[f] && x.setRequestHeader("If-Modified-Since", n.lastModified[f]), n.etag[f] && x.setRequestHeader("If-None-Match", n.etag[f])), (m.data && m.hasContent && m.contentType !== !1 || c.contentType) && x.setRequestHeader("Content-Type", m.contentType), x.setRequestHeader("Accept", m.dataTypes[0] && m.accepts[m.dataTypes[0]] ? m.accepts[m.dataTypes[0]] + ("*" !== m.dataTypes[0] ? ", " + ub + "; q=0.01" : "") : m.accepts["*"]);for (l in m.headers) {
        x.setRequestHeader(l, m.headers[l]);
      }if (m.beforeSend && (m.beforeSend.call(o, x, m) === !1 || 2 === v)) return x.abort();w = "abort";for (l in { success: 1, error: 1, complete: 1 }) {
        x[l](m[l]);
      }if (e = xb(tb, m, c, x)) {
        if (x.readyState = 1, k && p.trigger("ajaxSend", [x, m]), 2 === v) return x;m.async && m.timeout > 0 && (i = a.setTimeout(function () {
          x.abort("timeout");
        }, m.timeout));try {
          v = 1, e.send(t, z);
        } catch (y) {
          if (!(2 > v)) throw y;z(-1, y);
        }
      } else z(-1, "No Transport");function z(b, c, d, h) {
        var j,
            l,
            t,
            u,
            w,
            y = c;2 !== v && (v = 2, i && a.clearTimeout(i), e = void 0, g = h || "", x.readyState = b > 0 ? 4 : 0, j = b >= 200 && 300 > b || 304 === b, d && (u = zb(m, x, d)), u = Ab(m, u, x, j), j ? (m.ifModified && (w = x.getResponseHeader("Last-Modified"), w && (n.lastModified[f] = w), w = x.getResponseHeader("etag"), w && (n.etag[f] = w)), 204 === b || "HEAD" === m.type ? y = "nocontent" : 304 === b ? y = "notmodified" : (y = u.state, l = u.data, t = u.error, j = !t)) : (t = y, !b && y || (y = "error", 0 > b && (b = 0))), x.status = b, x.statusText = (c || y) + "", j ? q.resolveWith(o, [l, y, x]) : q.rejectWith(o, [x, y, t]), x.statusCode(s), s = void 0, k && p.trigger(j ? "ajaxSuccess" : "ajaxError", [x, m, j ? l : t]), r.fireWith(o, [x, y]), k && (p.trigger("ajaxComplete", [x, m]), --n.active || n.event.trigger("ajaxStop")));
      }return x;
    }, getJSON: function (a, b, c) {
      return n.get(a, b, c, "json");
    }, getScript: function (a, b) {
      return n.get(a, void 0, b, "script");
    } }), n.each(["get", "post"], function (a, b) {
    n[b] = function (a, c, d, e) {
      return n.isFunction(c) && (e = e || d, d = c, c = void 0), n.ajax(n.extend({ url: a, type: b, dataType: e, data: c, success: d }, n.isPlainObject(a) && a));
    };
  }), n._evalUrl = function (a) {
    return n.ajax({ url: a, type: "GET", dataType: "script", async: !1, global: !1, "throws": !0 });
  }, n.fn.extend({ wrapAll: function (a) {
      var b;return n.isFunction(a) ? this.each(function (b) {
        n(this).wrapAll(a.call(this, b));
      }) : (this[0] && (b = n(a, this[0].ownerDocument).eq(0).clone(!0), this[0].parentNode && b.insertBefore(this[0]), b.map(function () {
        var a = this;while (a.firstElementChild) {
          a = a.firstElementChild;
        }return a;
      }).append(this)), this);
    }, wrapInner: function (a) {
      return n.isFunction(a) ? this.each(function (b) {
        n(this).wrapInner(a.call(this, b));
      }) : this.each(function () {
        var b = n(this),
            c = b.contents();c.length ? c.wrapAll(a) : b.append(a);
      });
    }, wrap: function (a) {
      var b = n.isFunction(a);return this.each(function (c) {
        n(this).wrapAll(b ? a.call(this, c) : a);
      });
    }, unwrap: function () {
      return this.parent().each(function () {
        n.nodeName(this, "body") || n(this).replaceWith(this.childNodes);
      }).end();
    } }), n.expr.filters.hidden = function (a) {
    return !n.expr.filters.visible(a);
  }, n.expr.filters.visible = function (a) {
    return a.offsetWidth > 0 || a.offsetHeight > 0 || a.getClientRects().length > 0;
  };var Bb = /%20/g,
      Cb = /\[\]$/,
      Db = /\r?\n/g,
      Eb = /^(?:submit|button|image|reset|file)$/i,
      Fb = /^(?:input|select|textarea|keygen)/i;function Gb(a, b, c, d) {
    var e;if (n.isArray(b)) n.each(b, function (b, e) {
      c || Cb.test(a) ? d(a, e) : Gb(a + "[" + ("object" == typeof e && null != e ? b : "") + "]", e, c, d);
    });else if (c || "object" !== n.type(b)) d(a, b);else for (e in b) {
      Gb(a + "[" + e + "]", b[e], c, d);
    }
  }n.param = function (a, b) {
    var c,
        d = [],
        e = function (a, b) {
      b = n.isFunction(b) ? b() : null == b ? "" : b, d[d.length] = encodeURIComponent(a) + "=" + encodeURIComponent(b);
    };if (void 0 === b && (b = n.ajaxSettings && n.ajaxSettings.traditional), n.isArray(a) || a.jquery && !n.isPlainObject(a)) n.each(a, function () {
      e(this.name, this.value);
    });else for (c in a) {
      Gb(c, a[c], b, e);
    }return d.join("&").replace(Bb, "+");
  }, n.fn.extend({ serialize: function () {
      return n.param(this.serializeArray());
    }, serializeArray: function () {
      return this.map(function () {
        var a = n.prop(this, "elements");return a ? n.makeArray(a) : this;
      }).filter(function () {
        var a = this.type;return this.name && !n(this).is(":disabled") && Fb.test(this.nodeName) && !Eb.test(a) && (this.checked || !X.test(a));
      }).map(function (a, b) {
        var c = n(this).val();return null == c ? null : n.isArray(c) ? n.map(c, function (a) {
          return { name: b.name, value: a.replace(Db, "\r\n") };
        }) : { name: b.name, value: c.replace(Db, "\r\n") };
      }).get();
    } }), n.ajaxSettings.xhr = function () {
    try {
      return new a.XMLHttpRequest();
    } catch (b) {}
  };var Hb = { 0: 200, 1223: 204 },
      Ib = n.ajaxSettings.xhr();l.cors = !!Ib && "withCredentials" in Ib, l.ajax = Ib = !!Ib, n.ajaxTransport(function (b) {
    var c, d;return l.cors || Ib && !b.crossDomain ? { send: function (e, f) {
        var g,
            h = b.xhr();if (h.open(b.type, b.url, b.async, b.username, b.password), b.xhrFields) for (g in b.xhrFields) {
          h[g] = b.xhrFields[g];
        }b.mimeType && h.overrideMimeType && h.overrideMimeType(b.mimeType), b.crossDomain || e["X-Requested-With"] || (e["X-Requested-With"] = "XMLHttpRequest");for (g in e) {
          h.setRequestHeader(g, e[g]);
        }c = function (a) {
          return function () {
            c && (c = d = h.onload = h.onerror = h.onabort = h.onreadystatechange = null, "abort" === a ? h.abort() : "error" === a ? "number" != typeof h.status ? f(0, "error") : f(h.status, h.statusText) : f(Hb[h.status] || h.status, h.statusText, "text" !== (h.responseType || "text") || "string" != typeof h.responseText ? { binary: h.response } : { text: h.responseText }, h.getAllResponseHeaders()));
          };
        }, h.onload = c(), d = h.onerror = c("error"), void 0 !== h.onabort ? h.onabort = d : h.onreadystatechange = function () {
          4 === h.readyState && a.setTimeout(function () {
            c && d();
          });
        }, c = c("abort");try {
          h.send(b.hasContent && b.data || null);
        } catch (i) {
          if (c) throw i;
        }
      }, abort: function () {
        c && c();
      } } : void 0;
  }), n.ajaxSetup({ accepts: { script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript" }, contents: { script: /\b(?:java|ecma)script\b/ }, converters: { "text script": function (a) {
        return n.globalEval(a), a;
      } } }), n.ajaxPrefilter("script", function (a) {
    void 0 === a.cache && (a.cache = !1), a.crossDomain && (a.type = "GET");
  }), n.ajaxTransport("script", function (a) {
    if (a.crossDomain) {
      var b, c;return { send: function (e, f) {
          b = n("<script>").prop({ charset: a.scriptCharset, src: a.url }).on("load error", c = function (a) {
            b.remove(), c = null, a && f("error" === a.type ? 404 : 200, a.type);
          }), d.head.appendChild(b[0]);
        }, abort: function () {
          c && c();
        } };
    }
  });var Jb = [],
      Kb = /(=)\?(?=&|$)|\?\?/;n.ajaxSetup({ jsonp: "callback", jsonpCallback: function () {
      var a = Jb.pop() || n.expando + "_" + kb++;return this[a] = !0, a;
    } }), n.ajaxPrefilter("json jsonp", function (b, c, d) {
    var e,
        f,
        g,
        h = b.jsonp !== !1 && (Kb.test(b.url) ? "url" : "string" == typeof b.data && 0 === (b.contentType || "").indexOf("application/x-www-form-urlencoded") && Kb.test(b.data) && "data");return h || "jsonp" === b.dataTypes[0] ? (e = b.jsonpCallback = n.isFunction(b.jsonpCallback) ? b.jsonpCallback() : b.jsonpCallback, h ? b[h] = b[h].replace(Kb, "$1" + e) : b.jsonp !== !1 && (b.url += (lb.test(b.url) ? "&" : "?") + b.jsonp + "=" + e), b.converters["script json"] = function () {
      return g || n.error(e + " was not called"), g[0];
    }, b.dataTypes[0] = "json", f = a[e], a[e] = function () {
      g = arguments;
    }, d.always(function () {
      void 0 === f ? n(a).removeProp(e) : a[e] = f, b[e] && (b.jsonpCallback = c.jsonpCallback, Jb.push(e)), g && n.isFunction(f) && f(g[0]), g = f = void 0;
    }), "script") : void 0;
  }), n.parseHTML = function (a, b, c) {
    if (!a || "string" != typeof a) return null;"boolean" == typeof b && (c = b, b = !1), b = b || d;var e = x.exec(a),
        f = !c && [];return e ? [b.createElement(e[1])] : (e = ca([a], b, f), f && f.length && n(f).remove(), n.merge([], e.childNodes));
  };var Lb = n.fn.load;n.fn.load = function (a, b, c) {
    if ("string" != typeof a && Lb) return Lb.apply(this, arguments);var d,
        e,
        f,
        g = this,
        h = a.indexOf(" ");return h > -1 && (d = n.trim(a.slice(h)), a = a.slice(0, h)), n.isFunction(b) ? (c = b, b = void 0) : b && "object" == typeof b && (e = "POST"), g.length > 0 && n.ajax({ url: a, type: e || "GET", dataType: "html", data: b }).done(function (a) {
      f = arguments, g.html(d ? n("<div>").append(n.parseHTML(a)).find(d) : a);
    }).always(c && function (a, b) {
      g.each(function () {
        c.apply(this, f || [a.responseText, b, a]);
      });
    }), this;
  }, n.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function (a, b) {
    n.fn[b] = function (a) {
      return this.on(b, a);
    };
  }), n.expr.filters.animated = function (a) {
    return n.grep(n.timers, function (b) {
      return a === b.elem;
    }).length;
  };function Mb(a) {
    return n.isWindow(a) ? a : 9 === a.nodeType && a.defaultView;
  }n.offset = { setOffset: function (a, b, c) {
      var d,
          e,
          f,
          g,
          h,
          i,
          j,
          k = n.css(a, "position"),
          l = n(a),
          m = {};"static" === k && (a.style.position = "relative"), h = l.offset(), f = n.css(a, "top"), i = n.css(a, "left"), j = ("absolute" === k || "fixed" === k) && (f + i).indexOf("auto") > -1, j ? (d = l.position(), g = d.top, e = d.left) : (g = parseFloat(f) || 0, e = parseFloat(i) || 0), n.isFunction(b) && (b = b.call(a, c, n.extend({}, h))), null != b.top && (m.top = b.top - h.top + g), null != b.left && (m.left = b.left - h.left + e), "using" in b ? b.using.call(a, m) : l.css(m);
    } }, n.fn.extend({ offset: function (a) {
      if (arguments.length) return void 0 === a ? this : this.each(function (b) {
        n.offset.setOffset(this, a, b);
      });var b,
          c,
          d = this[0],
          e = { top: 0, left: 0 },
          f = d && d.ownerDocument;if (f) return b = f.documentElement, n.contains(b, d) ? (e = d.getBoundingClientRect(), c = Mb(f), { top: e.top + c.pageYOffset - b.clientTop, left: e.left + c.pageXOffset - b.clientLeft }) : e;
    }, position: function () {
      if (this[0]) {
        var a,
            b,
            c = this[0],
            d = { top: 0, left: 0 };return "fixed" === n.css(c, "position") ? b = c.getBoundingClientRect() : (a = this.offsetParent(), b = this.offset(), n.nodeName(a[0], "html") || (d = a.offset()), d.top += n.css(a[0], "borderTopWidth", !0), d.left += n.css(a[0], "borderLeftWidth", !0)), { top: b.top - d.top - n.css(c, "marginTop", !0), left: b.left - d.left - n.css(c, "marginLeft", !0) };
      }
    }, offsetParent: function () {
      return this.map(function () {
        var a = this.offsetParent;while (a && "static" === n.css(a, "position")) {
          a = a.offsetParent;
        }return a || Ea;
      });
    } }), n.each({ scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function (a, b) {
    var c = "pageYOffset" === b;n.fn[a] = function (d) {
      return K(this, function (a, d, e) {
        var f = Mb(a);return void 0 === e ? f ? f[b] : a[d] : void (f ? f.scrollTo(c ? f.pageXOffset : e, c ? e : f.pageYOffset) : a[d] = e);
      }, a, d, arguments.length);
    };
  }), n.each(["top", "left"], function (a, b) {
    n.cssHooks[b] = Ga(l.pixelPosition, function (a, c) {
      return c ? (c = Fa(a, b), Ba.test(c) ? n(a).position()[b] + "px" : c) : void 0;
    });
  }), n.each({ Height: "height", Width: "width" }, function (a, b) {
    n.each({ padding: "inner" + a, content: b, "": "outer" + a }, function (c, d) {
      n.fn[d] = function (d, e) {
        var f = arguments.length && (c || "boolean" != typeof d),
            g = c || (d === !0 || e === !0 ? "margin" : "border");return K(this, function (b, c, d) {
          var e;return n.isWindow(b) ? b.document.documentElement["client" + a] : 9 === b.nodeType ? (e = b.documentElement, Math.max(b.body["scroll" + a], e["scroll" + a], b.body["offset" + a], e["offset" + a], e["client" + a])) : void 0 === d ? n.css(b, c, g) : n.style(b, c, d, g);
        }, b, f ? d : void 0, f, null);
      };
    });
  }), n.fn.extend({ bind: function (a, b, c) {
      return this.on(a, null, b, c);
    }, unbind: function (a, b) {
      return this.off(a, null, b);
    }, delegate: function (a, b, c, d) {
      return this.on(b, a, c, d);
    }, undelegate: function (a, b, c) {
      return 1 === arguments.length ? this.off(a, "**") : this.off(b, a || "**", c);
    }, size: function () {
      return this.length;
    } }), n.fn.andSelf = n.fn.addBack, "function" == typeof define && define.amd && define("jquery", [], function () {
    return n;
  });var Nb = a.jQuery,
      Ob = a.$;return n.noConflict = function (b) {
    return a.$ === n && (a.$ = Ob), b && a.jQuery === n && (a.jQuery = Nb), n;
  }, b || (a.jQuery = a.$ = n), n;
});
/*
 * jQuery plugin for unified mouse and touch events
 *
 * Copyright (c) 2013-2016 Michael S. Mikowski
 * (mike[dot]mikowski[at]gmail[dotcom])
 *
 * Dual licensed under the MIT or GPL Version 2
 * http://jquery.org/license
 *
 * Versions
 *  1.3.x   - Removed all console references
 *          - Change bind to on, unbind to off
 *          - Reinstated ignore_select to ignore text and input areas by default
 *  1.2.x   - ignore_class => ignore_select, now defaults to ''
 *  1.1.9   - Fixed ue-test.html demo to scale properly
 *  1.1.8   - Removed prevent default from non-ue events
 *  1.1.7   - Corrected desktop zoom motion description
 *  1.1.0-5 - No code changes. Updated npm keywords. Fixed typos.
 *            Bumped version to represent maturity and stability.
 *  0.6.1   - Change px_radius from 5 to 10 pixels
 *  0.6.0   - Added px_tdelta_x and px_tdelta_y for deltas from start
 *          - Fixed onheld and drag conflicts
 *  0.5.0   - Updated docs, removed cruft, updated for jslint,
 *            updated test page (zoom)
 *  0.4.3   - Removed fatal execption possibility if originalEvent
 *            is not defined on event object
 *  0.4.2   - Updated documentation
 *  0.3.2   - Updated to jQuery 1.9.1.
 *            Confirmed 1.7.0-1.9.1 compatibility.
 *  0.3.1   - Change for jQuery plugins site
 *  0.3.0   - Initial jQuery plugin site release
 *          - Replaced scrollwheel zoom with drag motion.
 *            This resolved a conflict with scrollable areas.
 *
*/

/*jslint           browser : true,   continue : true,
  devel  : true,    indent : 2,       maxerr  : 50,
  newcap : true,  plusplus : true,    regexp  : true,
  sloppy : true,      vars : false,     white  : true
*/
/*global jQuery */

(function ($) {
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var $Special = $.event.special,
      // Shortcut for special event
  motionMapMap = {},
      // Map of pointer motions by cursor
  isMoveBound = false,
      // Flag if move handlers bound
  pxPinchZoom = -1,
      // Distance between pinch-zoom points
  optionKey = 'ue_bound',
      // Data key for storing options
  doDisableMouse = false,
      // Flag to discard mouse input
  defaultOptMap = { // Default option map
    bound_ns_map: {}, // Map of bound namespaces e.g.
    // bound_ns_map.utap.fred
    px_radius: 10, // Tolerated distance before dragstart
    ignore_select: 'textarea, select, input', // Elements to ignore
    max_tap_ms: 200, // Maximum time allowed for tap
    min_held_ms: 300 // Minimum time require for long-press
  },
      callbackList = [],
      // global callback stack
  zoomMouseNum = 1,
      // multiplier for mouse zoom
  zoomTouchNum = 4,
      // multiplier for touch zoom

  boundList,
      Ue,
      motionDragId,
      motionHeldId,
      motionDzoomId,
      motion1ZoomId,
      motion2ZoomId,
      checkMatchVal,
      removeListVal,
      pushUniqVal,
      makeListPlus,
      fnHeld,
      fnMotionStart,
      fnMotionMove,
      fnMotionEnd,
      onMouse,
      onTouch;
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN UTILITY METHODS ------------------
  // Begin utiltity /makeListPlus/
  // Returns an array with much desired methods:
  //   * remove_val(value) : remove element that matches
  //     the provided value. Returns number of elements
  //     removed.
  //   * match_val(value)  : shows if a value exists
  //   * push_uniq(value)  : pushes a value onto the stack
  //     iff it does not already exist there
  // Note: the reason I need this is to compare objects to
  //   objects (perhaps jQuery has something similar?)
  checkMatchVal = function (data) {
    var match_count = 0,
        idx;
    for (idx = this.length; idx; 0) {
      if (this[--idx] === data) {
        match_count++;
      }
    }
    return match_count;
  };
  removeListVal = function (data) {
    var removed_count = 0,
        idx;
    for (idx = this.length; idx; 0) {
      if (this[--idx] === data) {
        this.splice(idx, 1);
        removed_count++;
        idx++;
      }
    }
    return removed_count;
  };
  pushUniqVal = function (data) {
    if (checkMatchVal.call(this, data)) {
      return false;
    }
    this.push(data);
    return true;
  };
  // primary utility
  makeListPlus = function (input_list) {
    if (input_list && $.isArray(input_list)) {
      if (input_list.remove_val) {
        // The array appears to already have listPlus capabilities
        return input_list;
      }
    } else {
      input_list = [];
    }
    input_list.remove_val = removeListVal;
    input_list.match_val = checkMatchVal;
    input_list.push_uniq = pushUniqVal;

    return input_list;
  };
  // End utility /makeListPlus/
  //-------------------- END UTILITY METHODS -------------------

  //--------------- BEGIN JQUERY SPECIAL EVENTS ----------------
  // Unique array for bound objects
  boundList = makeListPlus();

  // Begin define special event handlers
  /*jslint unparam:true */
  Ue = {
    setup: function (data, name_list, bind_fn) {
      var this_el = this,
          $to_bind = $(this_el),
          seen_map = {},
          option_map,
          idx,
          namespace_key,
          ue_namespace_code,
          namespace_list;

      // if previous related event bound do not rebind, but do add to
      // type of event bound to this element, if not already noted
      if ($.data(this, optionKey)) {
        return;
      }

      option_map = {};
      $.extend(true, option_map, defaultOptMap);
      $.data(this_el, optionKey, option_map);

      namespace_list = makeListPlus(name_list.slice(0));
      if (!namespace_list.length || namespace_list[0] === "") {
        namespace_list = ["000"];
      }

      NSPACE_00: for (idx = 0; idx < namespace_list.length; idx++) {
        namespace_key = namespace_list[idx];

        if (!namespace_key) {
          continue NSPACE_00;
        }
        if (seen_map.hasOwnProperty(namespace_key)) {
          continue NSPACE_00;
        }

        seen_map[namespace_key] = true;

        ue_namespace_code = '.__ue' + namespace_key;

        $to_bind.on('mousedown' + ue_namespace_code, onMouse);
        $to_bind.on('touchstart' + ue_namespace_code, onTouch);
      }

      boundList.push_uniq(this_el); // record as bound element

      if (!isMoveBound) {
        // first element bound - adding global binds
        $(document).on('mousemove.__ue', onMouse);
        $(document).on('touchmove.__ue', onTouch);
        $(document).on('mouseup.__ue', onMouse);
        $(document).on('touchend.__ue', onTouch);
        $(document).on('touchcancel.__ue', onTouch);
        isMoveBound = true;
      }
    },

    // arg_map.type = string - name of event to bind
    // arg_map.data = poly - whatever (optional) data was passed when binding
    // arg_map.namespace = string - A sorted, dot-delimited list of namespaces
    //   specified when binding the event
    // arg_map.handler  = fn - the event handler the developer wishes to be bound
    //   to the event.  This function should be called whenever the event
    //   is triggered
    // arg_map.guid = number - unique ID for event handler, provided by jQuery
    // arg_map.selector = string - selector used by 'delegate' or 'live' jQuery
    //   methods.  Only available when these methods are used.
    //
    // this - the element to which the event handler is being bound
    // this always executes immediate after setup (if first binding)
    add: function (arg_map) {
      var this_el = this,
          option_map = $.data(this_el, optionKey),
          namespace_str = arg_map.namespace,
          event_type = arg_map.type,
          bound_ns_map,
          namespace_list,
          idx,
          namespace_key;
      if (!option_map) {
        return;
      }

      bound_ns_map = option_map.bound_ns_map;

      if (!bound_ns_map[event_type]) {
        // this indicates a non-namespaced entry
        bound_ns_map[event_type] = {};
      }

      if (!namespace_str) {
        return;
      }

      namespace_list = namespace_str.split('.');

      for (idx = 0; idx < namespace_list.length; idx++) {
        namespace_key = namespace_list[idx];
        bound_ns_map[event_type][namespace_key] = true;
      }
    },

    remove: function (arg_map) {
      var elem_bound = this,
          option_map = $.data(elem_bound, optionKey),
          bound_ns_map = option_map.bound_ns_map,
          event_type = arg_map.type,
          namespace_str = arg_map.namespace,
          namespace_list,
          idx,
          namespace_key;

      if (!bound_ns_map[event_type]) {
        return;
      }

      // No namespace(s) provided:
      // Remove complete record for custom event type (e.g. utap)
      if (!namespace_str) {
        delete bound_ns_map[event_type];
        return;
      }

      // Namespace(s) provided:
      // Remove namespace flags from each custom event typei (e.g. utap)
      // record.  If all claimed namespaces are removed, remove
      // complete record.
      namespace_list = namespace_str.split('.');

      for (idx = 0; idx < namespace_list.length; idx++) {
        namespace_key = namespace_list[idx];
        if (bound_ns_map[event_type][namespace_key]) {
          delete bound_ns_map[event_type][namespace_key];
        }
      }

      if ($.isEmptyObject(bound_ns_map[event_type])) {
        delete bound_ns_map[event_type];
      }
    },

    teardown: function (name_list) {
      var elem_bound = this,
          $bound = $(elem_bound),
          option_map = $.data(elem_bound, optionKey),
          bound_ns_map = option_map.bound_ns_map,
          idx,
          namespace_key,
          ue_namespace_code,
          namespace_list;

      // do not tear down if related handlers are still bound
      if (!$.isEmptyObject(bound_ns_map)) {
        return;
      }

      namespace_list = makeListPlus(name_list);
      namespace_list.push_uniq('000');

      NSPACE_01: for (idx = 0; idx < namespace_list.length; idx++) {
        namespace_key = namespace_list[idx];

        if (!namespace_key) {
          continue NSPACE_01;
        }

        ue_namespace_code = '.__ue' + namespace_key;
        $bound.off('mousedown' + ue_namespace_code);
        $bound.off('touchstart' + ue_namespace_code);
        $bound.off('mousewheel' + ue_namespace_code);
      }

      $.removeData(elem_bound, optionKey);

      // Unbind document events only after last element element is removed
      boundList.remove_val(this);
      if (boundList.length === 0) {
        // last bound element removed - removing global binds
        $(document).off('mousemove.__ue');
        $(document).off('touchmove.__ue');
        $(document).off('mouseup.__ue');
        $(document).off('touchend.__ue');
        $(document).off('touchcancel.__ue');
        isMoveBound = false;
      }
    }
  };
  /*jslint unparam:false */
  // End define special event handlers
  //--------------- BEGIN JQUERY SPECIAL EVENTS ----------------

  //------------------ BEGIN MOTION CONTROLS -------------------
  // Begin motion control /fnHeld/
  fnHeld = function (arg_map) {
    var timestamp = +new Date(),
        motion_id = arg_map.motion_id,
        motion_map = arg_map.motion_map,
        bound_ns_map = arg_map.bound_ns_map,
        event_ue;

    delete motion_map.tapheld_toid;

    if (!motion_map.do_allow_held) {
      return;
    }

    motion_map.px_end_x = motion_map.px_start_x;
    motion_map.px_end_y = motion_map.px_start_y;
    motion_map.ms_timestop = timestamp;
    motion_map.ms_elapsed = timestamp - motion_map.ms_timestart;

    if (bound_ns_map.uheld) {
      event_ue = $.Event('uheld');
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);
    }

    // remove tracking, as we want no futher action on this motion
    if (bound_ns_map.uheldstart) {
      event_ue = $.Event('uheldstart');
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);
      motionHeldId = motion_id;
    } else {
      delete motionMapMap[motion_id];
    }
  };
  // End motion control /fnHeld/


  // Begin motion control /fnMotionStart/
  fnMotionStart = function (arg_map) {
    var motion_id = arg_map.motion_id,
        event_src = arg_map.event_src,
        request_dzoom = arg_map.request_dzoom,
        option_map = $.data(arg_map.elem, optionKey),
        bound_ns_map = option_map.bound_ns_map,
        $target = $(event_src.target),
        do_zoomstart = false,
        motion_map,
        cb_map,
        event_ue;

    // this should never happen, but it does
    if (motionMapMap[motion_id]) {
      return;
    }

    // ignore on zoom
    if (request_dzoom && !bound_ns_map.uzoomstart) {
      return;
    }

    // :input selector includes text areas
    if ($target.is(option_map.ignore_select)) {
      return;
    }

    // Prevent default only after confirming handling this event
    event_src.preventDefault();

    cb_map = callbackList.pop();
    while (cb_map) {
      if ($target.is(cb_map.selector_str) || $(arg_map.elem).is(cb_map.selector_str)) {
        if (cb_map.callback_match) {
          cb_map.callback_match(arg_map);
        }
      } else {
        if (cb_map.callback_nomatch) {
          cb_map.callback_nomatch(arg_map);
        }
      }
      cb_map = callbackList.pop();
    }

    motion_map = {
      do_allow_tap: bound_ns_map.utap ? true : false,
      do_allow_held: bound_ns_map.uheld || bound_ns_map.uheldstart ? true : false,
      elem_bound: arg_map.elem,
      elem_target: event_src.target,
      ms_elapsed: 0,
      ms_timestart: event_src.timeStamp,
      ms_timestop: undefined,
      option_map: option_map,
      orig_target: event_src.target,
      px_current_x: event_src.clientX,
      px_current_y: event_src.clientY,
      px_end_x: undefined,
      px_end_y: undefined,
      px_start_x: event_src.clientX,
      px_start_y: event_src.clientY,
      timeStamp: event_src.timeStamp
    };

    motionMapMap[motion_id] = motion_map;

    if (bound_ns_map.uzoomstart) {
      if (request_dzoom) {
        motionDzoomId = motion_id;
      } else if (!motion1ZoomId) {
        motion1ZoomId = motion_id;
      } else if (!motion2ZoomId) {
        motion2ZoomId = motion_id;
        event_ue = $.Event('uzoomstart');
        do_zoomstart = true;
      }

      if (do_zoomstart) {
        event_ue = $.Event('uzoomstart');
        motion_map.px_delta_zoom = 0;
        $.extend(event_ue, motion_map);
        $(motion_map.elem_bound).trigger(event_ue);
        return;
      }
    }

    if (bound_ns_map.uheld || bound_ns_map.uheldstart) {
      motion_map.tapheld_toid = setTimeout(function () {
        fnHeld({
          motion_id: motion_id,
          motion_map: motion_map,
          bound_ns_map: bound_ns_map
        });
      }, option_map.min_held_ms);
    }
  };
  // End motion control /fnMotionStart/

  // Begin motion control /fnMotionMove/
  fnMotionMove = function (arg_map) {
    var motion_id = arg_map.motion_id,
        event_src = arg_map.event_src,
        do_zoommove = false,
        motion_map,
        option_map,
        bound_ns_map,
        is_over_rad,
        event_ue,
        px_pinch_zoom,
        px_delta_zoom,
        mzoom1_map,
        mzoom2_map;

    if (!motionMapMap[motion_id]) {
      return;
    }

    // Prevent default only after confirming handling this event
    event_src.preventDefault();

    motion_map = motionMapMap[motion_id];
    option_map = motion_map.option_map;
    bound_ns_map = option_map.bound_ns_map;

    motion_map.timeStamp = event_src.timeStamp;
    motion_map.elem_target = event_src.target;
    motion_map.ms_elapsed = event_src.timeStamp - motion_map.ms_timestart;

    motion_map.px_delta_x = event_src.clientX - motion_map.px_current_x;
    motion_map.px_delta_y = event_src.clientY - motion_map.px_current_y;

    motion_map.px_current_x = event_src.clientX;
    motion_map.px_current_y = event_src.clientY;

    motion_map.px_tdelta_x = motion_map.px_start_x - event_src.clientX;
    motion_map.px_tdelta_y = motion_map.px_start_y - event_src.clientY;

    is_over_rad = Math.abs(motion_map.px_tdelta_x) > option_map.px_radius || Math.abs(motion_map.px_tdelta_y) > option_map.px_radius;
    // native event object override
    motion_map.timeStamp = event_src.timeStamp;

    // disallow held or tap if outside of zone
    if (is_over_rad) {
      motion_map.do_allow_tap = false;
      motion_map.do_allow_held = false;
    }

    // disallow tap if time has elapsed 
    if (motion_map.ms_elapsed > option_map.max_tap_ms) {
      motion_map.do_allow_tap = false;
    }

    if (motion1ZoomId && motion2ZoomId && (motion_id === motion1ZoomId || motion_id === motion2ZoomId)) {
      motionMapMap[motion_id] = motion_map;
      mzoom1_map = motionMapMap[motion1ZoomId];
      mzoom2_map = motionMapMap[motion2ZoomId];

      px_pinch_zoom = Math.floor(Math.sqrt(Math.pow(mzoom1_map.px_current_x - mzoom2_map.px_current_x, 2) + Math.pow(mzoom1_map.px_current_y - mzoom2_map.px_current_y, 2)) + 0.5);

      if (pxPinchZoom === -1) {
        px_delta_zoom = 0;
      } else {
        px_delta_zoom = (px_pinch_zoom - pxPinchZoom) * zoomTouchNum;
      }

      // save value for next iteration delta comparison
      pxPinchZoom = px_pinch_zoom;
      do_zoommove = true;
    } else if (motionDzoomId === motion_id) {
      if (bound_ns_map.uzoommove) {
        px_delta_zoom = motion_map.px_delta_y * zoomMouseNum;
        do_zoommove = true;
      }
    }

    if (do_zoommove) {
      event_ue = $.Event('uzoommove');
      motion_map.px_delta_zoom = px_delta_zoom;
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);
      return;
    }

    if (motionHeldId === motion_id) {
      if (bound_ns_map.uheldmove) {
        event_ue = $.Event('uheldmove');
        $.extend(event_ue, motion_map);
        $(motion_map.elem_bound).trigger(event_ue);
      }
      return;
    }

    if (motionDragId === motion_id) {
      if (bound_ns_map.udragmove) {
        event_ue = $.Event('udragmove');
        $.extend(event_ue, motion_map);
        $(motion_map.elem_bound).trigger(event_ue);
      }
      return;
    }

    if (bound_ns_map.udragstart && motion_map.do_allow_tap === false && motion_map.do_allow_held === false && !(motionDragId && motionHeldId)) {
      motionDragId = motion_id;
      event_ue = $.Event('udragstart');
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);

      if (motion_map.tapheld_toid) {
        clearTimeout(motion_map.tapheld_toid);
        delete motion_map.tapheld_toid;
      }
    }
  };
  // End motion control /fnMotionMove/

  // Begin motion control /fnMotionEnd/
  fnMotionEnd = function (arg_map) {
    var motion_id = arg_map.motion_id,
        event_src = arg_map.event_src,
        do_zoomend = false,
        motion_map,
        option_map,
        bound_ns_map,
        event_ue;

    doDisableMouse = false;

    if (!motionMapMap[motion_id]) {
      return;
    }

    motion_map = motionMapMap[motion_id];
    option_map = motion_map.option_map;
    bound_ns_map = option_map.bound_ns_map;

    motion_map.elem_target = event_src.target;
    motion_map.ms_elapsed = event_src.timeStamp - motion_map.ms_timestart;
    motion_map.ms_timestop = event_src.timeStamp;

    if (motion_map.px_current_x) {
      motion_map.px_delta_x = event_src.clientX - motion_map.px_current_x;
      motion_map.px_delta_y = event_src.clientY - motion_map.px_current_y;
    }

    motion_map.px_current_x = event_src.clientX;
    motion_map.px_current_y = event_src.clientY;

    motion_map.px_end_x = event_src.clientX;
    motion_map.px_end_y = event_src.clientY;

    motion_map.px_tdelta_x = motion_map.px_start_x - motion_map.px_end_x;
    motion_map.px_tdelta_y = motion_map.px_start_y - motion_map.px_end_y;

    // native event object override
    motion_map.timeStamp = event_src.timeStamp;

    // clear-out any long-hold tap timer
    if (motion_map.tapheld_toid) {
      clearTimeout(motion_map.tapheld_toid);
      delete motion_map.tapheld_toid;
    }

    // trigger utap
    if (bound_ns_map.utap && motion_map.ms_elapsed <= option_map.max_tap_ms && motion_map.do_allow_tap) {
      event_ue = $.Event('utap');
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);
    }

    // trigger udragend
    if (motion_id === motionDragId) {
      if (bound_ns_map.udragend) {
        event_ue = $.Event('udragend');
        $.extend(event_ue, motion_map);
        $(motion_map.elem_bound).trigger(event_ue);
      }
      motionDragId = undefined;
    }

    // trigger heldend
    if (motion_id === motionHeldId) {
      if (bound_ns_map.uheldend) {
        event_ue = $.Event('uheldend');
        $.extend(event_ue, motion_map);
        $(motion_map.elem_bound).trigger(event_ue);
      }
      motionHeldId = undefined;
    }

    // trigger uzoomend
    if (motion_id === motionDzoomId) {
      do_zoomend = true;
      motionDzoomId = undefined;
    }

    // cleanup zoom info
    else if (motion_id === motion1ZoomId) {
        if (motion2ZoomId) {
          motion1ZoomId = motion2ZoomId;
          motion2ZoomId = undefined;
          do_zoomend = true;
        } else {
          motion1ZoomId = undefined;
        }
        pxPinchZoom = -1;
      }
    if (motion_id === motion2ZoomId) {
      motion2ZoomId = undefined;
      pxPinchZoom = -1;
      do_zoomend = true;
    }

    if (do_zoomend && bound_ns_map.uzoomend) {
      event_ue = $.Event('uzoomend');
      motion_map.px_delta_zoom = 0;
      $.extend(event_ue, motion_map);
      $(motion_map.elem_bound).trigger(event_ue);
    }
    // remove pointer from consideration
    delete motionMapMap[motion_id];
  };
  // End motion control /fnMotionEnd/
  //------------------ END MOTION CONTROLS -------------------

  //------------------- BEGIN EVENT HANDLERS -------------------
  // Begin event handler /onTouch/ for all touch events.
  // We use the 'type' attribute to dispatch to motion control
  onTouch = function (event) {
    var this_el = this,
        timestamp = +new Date(),
        o_event = event.originalEvent,
        touch_list = o_event ? o_event.changedTouches || [] : [],
        touch_count = touch_list.length,
        idx,
        touch_event,
        motion_id,
        handler_fn;

    doDisableMouse = true;

    event.timeStamp = timestamp;

    switch (event.type) {
      case 'touchstart':
        handler_fn = fnMotionStart;break;
      case 'touchmove':
        handler_fn = fnMotionMove;break;
      case 'touchend':
      case 'touchcancel':
        handler_fn = fnMotionEnd;break;
      default:
        handler_fn = null;
    }

    if (!handler_fn) {
      return;
    }

    for (idx = 0; idx < touch_count; idx++) {
      touch_event = touch_list[idx];

      motion_id = 'touch' + String(touch_event.identifier);

      event.clientX = touch_event.clientX;
      event.clientY = touch_event.clientY;
      handler_fn({
        elem: this_el,
        motion_id: motion_id,
        event_src: event
      });
    }
  };
  // End event handler /onTouch/


  // Begin event handler /onMouse/ for all mouse events
  // We use the 'type' attribute to dispatch to motion control
  onMouse = function (event) {
    var this_el = this,
        motion_id = 'mouse' + String(event.button),
        request_dzoom = false,
        handler_fn;

    if (doDisableMouse) {
      event.stopImmediatePropagation();
      return;
    }

    if (event.shiftKey) {
      request_dzoom = true;
    }

    // skip left or middle clicks
    if (event.type !== 'mousemove') {
      if (event.button !== 0) {
        return true;
      }
    }

    switch (event.type) {
      case 'mousedown':
        handler_fn = fnMotionStart;break;
      case 'mouseup':
        handler_fn = fnMotionEnd;break;
      case 'mousemove':
        handler_fn = fnMotionMove;break;
      default:
        handler_fn = null;
    }

    if (!handler_fn) {
      return;
    }

    handler_fn({
      elem: this_el,
      event_src: event,
      request_dzoom: request_dzoom,
      motion_id: motion_id
    });
  };
  // End event handler /onMouse/
  //-------------------- END EVENT HANDLERS --------------------

  // Export special events through jQuery API
  $Special.ue = $Special.utap = $Special.uheld = $Special.uzoomstart = $Special.uzoommove = $Special.uzoomend = $Special.udragstart = $Special.udragmove = $Special.udragend = $Special.uheldstart = $Special.uheldmove = $Special.uheldend = Ue;
  $.ueSetGlobalCb = function (selector_str, callback_match, callback_nomatch) {
    callbackList.push({
      selector_str: selector_str || '',
      callback_match: callback_match || null,
      callback_nomatch: callback_nomatch || null
    });
  };
})(jQuery);
/*
 * jQuery global custom event plugin (gevent)
 *
 * Copyright (c) 2013 Michael S. Mikowski
 * (mike[dot]mikowski[at]gmail[dotcom])
 *
 * Dual licensed under the MIT or GPL Version 2
 * http://jquery.org/license
 *
 * Versions
 *  0.1.5 - initial release
 *  0.1.6 - enhanced publishEvent (publish) method pass
 *          a non-array variable as the second argument
 *          to a subscribed function (the first argument
 *          is always the event object).
 *  0.1.7-10, 0.2.0
 *        - documentation changes
 *  1.0.2 - cleaned-up logic, bumped version
 *  1.1.2 - added keywords
 *
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/
/*global jQuery*/

(function ($) {
  'use strict';

  $.gevent = function () {
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var subscribeEvent,
        publishEvent,
        unsubscribeEvent,
        $customSubMap = {};
    //----------------- END MODULE SCOPE VARIABLES ---------------

    //------------------- BEGIN PUBLIC METHODS -------------------
    // BEGIN public method /publishEvent/
    // Example  :
    //   $.gevent.publish(
    //     'spa-model-msg-receive',
    //     [ { user : 'fred', msg : 'Hi gang' } ]
    //   );
    // Purpose  :
    //   Publish an event with an optional list of arguments
    //   which a subscribed handler will receive after the event object.
    // Arguments (positional)
    //   * 0 ( event_name )  - The global event name
    //   * 1 ( data )        - Optional data to be passed as argument(s)
    //                         to subscribed functions after the event
    //                         object. Provide an array for multiple
    //                         arguments.
    // Throws   : none
    // Returns  : none
    //
    publishEvent = function () {
      var arg_list = [],
          arg_count,
          event_name,
          event_obj,
          data,
          data_list;

      arg_list = arg_list.slice.call(arguments, 0);
      arg_count = arg_list.length;

      if (arg_count === 0) {
        return false;
      }

      event_name = arg_list.shift();
      event_obj = $customSubMap[event_name];

      if (!event_obj) {
        return false;
      }

      if (arg_count > 1) {
        data = arg_list.shift();
        data_list = $.isArray(data) ? data : [data];
      } else {
        data_list = [];
      }

      event_obj.trigger(event_name, data_list);
      return true;
    };
    // END public method /publishEvent/

    // BEGIN public method /subscribeEvent/
    // Example  :
    //   $.gevent.subscribe(
    //     $( '#msg' ),
    //     'spa-msg-receive',
    //     onModelMsgReceive
    //   );
    // Purpose  :
    //   Subscribe a function to a published event on a jQuery collection
    // Arguments (positional)
    //   * 0 ( $collection ) - The jQuery collection on which to bind event
    //   * 1 ( event_name )  - The global event name
    //   * 2 ( fn ) - The function to bound to the event on the collection
    // Throws   : none
    // Returns  : none
    //
    subscribeEvent = function ($collection, event_name, fn) {
      $collection.on(event_name, fn);

      if ($customSubMap[event_name]) {
        $customSubMap[event_name] = $customSubMap[event_name].add($collection);
      } else {
        $customSubMap[event_name] = $collection;
      }
    };
    // END public method /subscribeEvent/

    // BEGIN public method /unsubscribeEvent/
    // Example  :
    //   $.gevent.unsubscribe(
    //     $( '#msg' ),
    //     'spa-model-msg-receive'
    //   );
    // Purpose  :
    //   Remove a binding for the named event on a provided collection
    // Arguments (positional)
    //   * 0 ( $collection ) - The jQuery collection on which to bind event
    //   * 1 ( event_name )  - The global event name
    // Throws   : none
    // Returns  : none
    //
    unsubscribeEvent = function ($collection, event_name) {
      if (!$customSubMap[event_name]) {
        return false;
      }

      $customSubMap[event_name] = $customSubMap[event_name].not($collection);

      if ($customSubMap[event_name].length === 0) {
        delete $customSubMap[event_name];
      }

      return true;
    };
    // END public method /unsubscribeEvent/
    //------------------- END PUBLIC METHODS ---------------------

    // return public methods
    return {
      publish: publishEvent,
      subscribe: subscribeEvent,
      unsubscribe: unsubscribeEvent
    };
  }();
})(jQuery);
/*
 * Jquery plugin for state managment through the URI anchor (hash fragment)
 *
 * Copyright (c) 2013 Michael S. Mikowski
 * (mike[dot]mikowski[at]gmail[dotcom])
 *
 * Dual licensed under the MIT or GPL Version 2
 * http://jquery.org/license
 *
 * Versions
 *  1.1.1-3 - Initial jQuery plugin site releases
 *
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global jQuery */

(function ($) {
  $.uriAnchor = function () {
    //---------------- BEGIN MODULE SCOPE VARIABLES --------------
    var configMap = {
      regex_anchor_clean1: /^[#!]*/,
      regex_anchor_clean2: /\?[^?]*$/,
      settable_map_key: { schema_map: true },
      schema_map: null
    },
        getErrorReject,
        getVarType,
        getCleanAnchorString,
        parseStringToMap,
        makeAnchorString,
        setAnchor,
        makeAnchorMap,
        configModule;
    //----------------- END MODULE SCOPE VARIABLES ---------------

    //------------------- BEGIN UTILITY METHODS ------------------
    getErrorReject = function (message) {
      var error = new Error();
      error.name = 'Anchor Schema Reject';
      error.message = message;
      return error;
    };

    // Begin public method /getVarType/
    // Returns 'Object', 'Array', 'String', 'Number', 'Boolean', 'Undefined'
    getVarType = function (data) {
      if (data === undefined) {
        return 'Undefined';
      }
      if (data === null) {
        return 'Null';
      }
      return {}.toString.call(data).slice(8, -1);
    };
    // End public method /getVarType/

    // Begin internal utility to clean bookmark
    getCleanAnchorString = function () {
      return String(document.location.hash)
      // remove any leading pounds or bangs
      .replace(configMap.regex_anchor_clean1, '')
      // snip off after question-mark ( a ClickStreet bug )
      .replace(configMap.regex_anchor_clean2, '');
    };
    // End internal utility to clean bookmark

    // Begin internal utility /parseStringToMap/
    parseStringToMap = function (arg_map) {
      var input_string = arg_map.input_string || '',
          delimit_char = arg_map.delimit_char || '&',
          delimit_kv_char = arg_map.delimit_kv_char || '=',
          output_map = {},
          splitter_array,
          i,
          key_val_array;

      splitter_array = input_string.split(delimit_char);

      for (i = 0; i < splitter_array.length; i++) {
        key_val_array = splitter_array[i].split(delimit_kv_char);

        if (key_val_array.length === 1) {
          output_map[decodeURIComponent(key_val_array[0])] = true;
        } else if (key_val_array.length === 2) {
          output_map[decodeURIComponent(key_val_array[0])] = decodeURIComponent(key_val_array[1]);
        }
      }
      return output_map;
    };
    // End internal utility /parseStringToMap/

    // Begin utility /makeAnchorString/
    // -- all the heavy lifting for setAnchor ( see below )
    // Converts a map into the anchor component as described
    // in setAnchor
    makeAnchorString = function (anchor_map_in, option_map_in) {
      var anchor_map = anchor_map_in || {},
          option_map = option_map_in || {},
          delimit_char = option_map.delimit_char || '&',
          delimit_kv_char = option_map.delimit_kv_char || '=',
          sub_delimit_char = option_map.sub_delimit_char || ':',
          dep_delimit_char = option_map.dep_delimit_char || '|',
          dep_kv_delimit_char = option_map.dep_kv_delimit_char || ',',
          schema_map = configMap.schema_map,
          key_val_array = [],
          schema_map_val,
          schema_map_dep,
          schema_map_dep_val,
          key_name,
          key_value,
          class_name,
          output_kv_string,
          sub_key_name,
          dep_map,
          dep_key_name,
          dep_key_value,
          dep_class_name,
          dep_kv_array;

      if (getVarType(anchor_map) !== 'Object') {
        return false;
      }

      for (key_name in anchor_map) {
        // filter out inherited properties
        if (anchor_map.hasOwnProperty(key_name)) {

          // skip empty and dependent keys
          if (!key_name) {
            continue;
          }
          if (key_name.indexOf('_') === 0) {
            continue;
          }

          // check against anchor schema if provided
          if (schema_map) {
            if (!schema_map[key_name]) {
              throw getErrorReject('Independent key |' + key_name + '| not authorized by anchor schema');
            }
          }

          output_kv_string = '';
          key_value = anchor_map[key_name];

          if (key_value === undefined) {
            key_value = '';
          }

          class_name = getVarType(key_value);

          // check against anchor schema map of allowable
          // values is provided
          if (schema_map) {
            schema_map_val = schema_map[key_name];
            if (getVarType(schema_map_val) === 'Object' && !schema_map_val[String(key_value)]) {
              throw getErrorReject('Independent key-value pair |' + key_name + '|' + String(key_value) + '| not authorized by anchor schema');
            }
          }

          // Booleans, we skip false
          if (class_name === 'Boolean') {
            if (key_value) {
              output_kv_string += encodeURIComponent(key_name);
            }
          }
          // String and Number
          else {
              output_kv_string += encodeURIComponent(key_name) + delimit_kv_char + encodeURIComponent(key_value);
            }

          sub_key_name = '_' + key_name;
          if (anchor_map.hasOwnProperty(sub_key_name)) {
            dep_map = anchor_map[sub_key_name];
            dep_kv_array = [];

            if (schema_map) {
              schema_map_dep = schema_map[sub_key_name];
              if (!schema_map_dep) {
                throw getErrorReject('Dependent key |' + sub_key_name + '| not authorized by anchor schema');
              }
            } else {
              schema_map_dep = null;
            }

            for (dep_key_name in dep_map) {
              if (dep_map.hasOwnProperty(dep_key_name)) {
                dep_key_value = dep_map[dep_key_name];
                dep_class_name = getVarType(dep_key_value);

                if (schema_map_dep) {
                  schema_map_dep_val = schema_map_dep[dep_key_name];
                  if (getVarType(schema_map_dep_val) === 'Object' && !schema_map_dep_val[String(dep_key_value)]) {
                    throw getErrorReject('Dependent key-value pair |' + dep_key_name + '|' + String(dep_key_value) + '| not authorized by anchor schema');
                  }
                }

                // Booleans, we skip false
                if (class_name === 'Boolean') {
                  if (dep_key_value === true) {
                    dep_kv_array.push(encodeURIComponent(dep_key_name));
                  }
                }
                // String and Number
                else {
                    dep_kv_array.push(encodeURIComponent(dep_key_name) + dep_kv_delimit_char + encodeURIComponent(dep_key_value));
                  }
              }
            }
            // append dependent arguments if there are any
            if (dep_kv_array.length > 0) {
              output_kv_string += sub_delimit_char + dep_kv_array.join(dep_delimit_char);
            }
          }
          key_val_array.push(output_kv_string);
        }
      }

      return key_val_array.join(delimit_char);
    };
    // End utility /makeAnchorString/
    //-------------------- END UTILITY METHODS -------------------

    //------------------- BEGIN PUBLIC METHODS -------------------
    // Begin public method /setAnchor/
    // Purpose     :
    //   Sets Anchor component of the URI from a Map
    //   (The Anchor component is also known as the
    //   'hash fragment' or 'bookmark component')
    // Arguments  : positional -
    //   * 1 ( anchor_map )   : The map to be encoded to the URI anchor
    //   * 2 ( option_map )   : map of options
    //   * 3 ( replace_flag )  : boolean flag to replace the URI
    //     When true, the URI is replaced, which means the prior URI
    //     is not entered into the browser history
    // Environment : Expects the document.location browser object
    // Settings    : none
    // Returns     : boolean: true on success, false on failure
    // Throws      : none
    // Discussion  :
    //
    //  The first positional argument, anchor_map, may be a simple map:
    //    $.uriAnchor.setAnchor({
    //      page   : 'profile',
    //      slider : 'confirm',
    //      color  : 'red'
    //    });
    //
    //  This changes the URI anchor to:
    //     #!page=profile&slider=confirm&color=red
    //
    //  All these arguments are independent, that is, they can vary
    //  independent of each other. We also support dependent values -
    //  values that depend on others.
    //
    //  An independent argument key has no '_' prefix.  The same key name,
    //  prefixed by an '_', holds the arguments that are dependent on
    //  an independent argument.  The dependent key always points
    //  to a map.  Consider:
    //
    //    $.uriAnchor.setAnchor({
    //      page   : 'profile',
    //      _page  : {
    //        uname   : 'wendy',
    //        online  : 'today'
    //      }
    //    });
    //
    //  This changes the URI Anchor to:
    //    #!page=profile:uname,wendy|online,today
    //
    //  Only independent keys and their matching dependent keys are
    //  processed.  All other keys are ignored.  Importantly, this includes
    //  keys of the form _s_/key/ ( e.g. '_s_page' ) returned by makeAnchorMap
    //
    //  Setting a more complex anchor map is illustrated below:
    //    $.uriAnchor.setAnchor({
    //      page : 'profile',
    //      _page : {
    //        uname   : 'wendy',
    //        online  : 'today'
    //      },
    //      slider  : 'confirm',
    //      _slider : {
    //       text   : 'hello',
    //       pretty : false
    //      },
    //      color : 'red'
    //    });
    //
    //  This sets the URI Anchor to:
    //     #!page=profile:uname,wendy|online,today&slider=confirm:text,hello\
    //       |pretty,false&color=red
    //
    //   Options: The second positional argument tp this method, option_map,
    //   provides a number of options for delimiters:
    //     * delimit_char     : delimiter independent args
    //       Defaults to '&'
    //     * delimit_kv_char  : delimiter key-value of independent args
    //       Defaults to '='
    //     * sub_delimit_char : delimiter independent and dependent args
    //       Defaults to ':'
    //     * dep_delimit_char : delimiter between key-value of dependent args
    //       Defaults to '|'
    //     * dep_kv_delimit_char : key-value delimiter for dependent args.
    //       Defaults to ','
    //
    //   Boolean values ( as part of a key-value pair ) are convert into
    //     the stings 'true' or 'false'.
    //
    //  Validation:
    //
    //  As of 1.0, the ability to optionally check the validity of the
    //  Anchor against a schema has been included.  Since we don't expect
    //  the allowable schema to change during run-time, we use a
    //  module configuration to set the schema, like so:
    //
    //    $uriAnchor.configModule({
    //      schema_map : {
    //        page    : { profile : true, pdf : true },
    //        _page   : {
    //          uname   : true,
    //          online  : { 'today','yesterday','earlier' }
    //        },
    //        slider  : { confirm : 'deny' },
    //        _slider : { text : 'goodbye' },
    //        color   : { red : true, green : true, blue : true }
    //      }
    //    });
    //
    //  This check occurs only during setting of the Anchor, not
    //  during its parsing ( See makeAnchorMap )
    //
    //  The replace_flag instructs the routine to replace the uri,
    //  discarding browser history
    //
    setAnchor = function (anchor_map, option_map, replace_flag) {
      var anchor_string = makeAnchorString(anchor_map, option_map),
          uri_array,
          uri_string;

      uri_array = document.location.href.split('#', 2);
      uri_string = anchor_string ? uri_array[0] + '#!' + anchor_string : uri_array[0];

      if (replace_flag) {
        if (anchor_string) {
          document.location.replace(uri_array[0] + '#!' + anchor_string);
        } else {
          document.location.replace(uri_array[0]);
        }
        return true;
      }
      // we replace the full href so that jquery recognizes the uri
      // change
      document.location.href = uri_string;
    };
    // End public method /setAnchor/

    // Begin public method /makeAnchorMap/
    // Purpose     : Parses URI anchor and returns as map
    // Arguments  : none
    // Environment : Expects the document.location browser object
    // Settings    : none
    // Returns     : Map
    // Throws      : none
    //
    // Discussion :
    //   Parses the browser URI anchor into a map using the same
    //   rules used to set the anchor in the method setAnchor
    //   ( see above ).
    //
    //   This method creates an additional key type, _s_<indendent_arg>
    //   for each independent argument with dependent arguments.
    //
    //   These keys point to a string representation of the independent
    //   argument along with all its dependent arguments.
    //
    //   These values are ignored by setAnchor, but they are useful
    //   for routines using setAnchor to check if a part of the anchor
    //   has changed.
    //
    // Example:
    //   If the browser URI Anchor looks like this:
    //     #!page=profile:uname,wendy|online,true&slider=confirm:text,hello\
    //     |pretty,false&color=red
    //
    //   Then calling $.uriAnchor.makeAnchorMap();
    //   will return a map that looks like so:
    //
    //     { page : 'profile',
    //       _page : {
    //         uname   : 'wendy',
    //         online  : 'today'
    //       },
    //       _s_page : 'profile:uname,wendy|online,today',
    //       slider  : 'confirm',
    //       _slider : {
    //        text   : 'hello',
    //        pretty : false
    //       },
    //       _s_slider : 'confirm:text,hello|pretty,false',
    //       color : 'red'
    //     };
    //

    makeAnchorMap = function () {
      var anchor_string = getCleanAnchorString(),
          anchor_map,
          idx,
          keys_array,
          key_name,
          key_value,
          dep_array;

      if (anchor_string === '') {
        return {};
      }

      // first pass decompose
      anchor_map = parseStringToMap({
        input_string: anchor_string,
        delimit_char: '&',
        delimit_kv_char: '='
      });

      // extract keys to prevent run-away recursion when
      // adding keys to anchor_map, below
      keys_array = [];
      for (key_name in anchor_map) {
        if (anchor_map.hasOwnProperty(key_name)) {
          keys_array.push(key_name);
        }
      }

      for (idx = 0; idx < keys_array.length; idx++) {
        key_name = keys_array[idx];
        key_value = anchor_map[key_name];

        if (getVarType(key_value) !== 'String' || key_name === '') {
          continue;
        }

        // include string representation with all dependent keys and values
        anchor_map['_s_' + key_name] = key_value;

        dep_array = key_value.split(':');

        if (dep_array[1] && dep_array[1] !== '') {
          anchor_map[key_name] = dep_array[0];

          anchor_map['_' + key_name] = parseStringToMap({
            input_string: dep_array[1],
            delimit_char: '|',
            delimit_kv_char: ','
          });
        }
      }
      return anchor_map;
    };
    // End public method /makeAnchorMap/

    // Begin public method /configModule/
    // Set configuration options
    configModule = function (arg_map) {
      var settable_map = configMap.settable_map_key,
          key_name,
          error;

      for (key_name in arg_map) {
        if (arg_map.hasOwnProperty(key_name)) {
          if (settable_map.hasOwnProperty(key_name)) {
            configMap[key_name] = arg_map[key_name];
          } else {
            error = new Error();
            error.name = 'Bad Input';
            error.message = 'Setting config key |' + key_name + '| is not supported';
            throw error;
          }
        }
      }
    };
    // End public method /configModule/

    // return public methods
    return {
      configModule: configModule,
      getVarType: getVarType,
      makeAnchorMap: makeAnchorMap,
      makeAnchorString: makeAnchorString,
      setAnchor: setAnchor
    };
    //------------------- END PUBLIC METHODS ---------------------
  }();
})(jQuery);
var spa = function () {
  'use script';

  var initModule = function ($container) {
    spa.model.initModule();
    spa.shell.initModule($container);
  };
  return { initModule: initModule };
}();
console.log('spa', spa);
spa.avtr = function () {}();
console.log('spa.avtr', spa.avtr);

// Тестирование консоль

/*
var $t = $('<div/>')

$.gevent.subscribe($t, 'spa-login', function ( event, user ) {
  console.log('Hello!', user.name)
})
*/
spa.chat = function () {
  'use strict';

  var configMap = {
    main_html: String() + '<div class="spa-chat">' + '<div class="spa-chat-head">' + '<div class="spa-chat-head-toggle">+</div>' + '<div class="spa-chat-head-title">' + 'Чат' + '</div>' + '</div>' + '<div class="spa-chat-closer">x</div>' + '<div class="spa-chat-sizer">' + '<div class="spa-chat-list">' + '<div class="spa-chat-list-box"></div>' + '</div>' + '<div class="spa-chat-msg">' + '<div class="spa-chat-msg-log"></div>' + '<div class="spa-chat-msg-in">' + '<form class="spa-chat-msg-form">' + '<input type="text"/>' + '<input type="submit" style="display: none"/>' + '<div class="spa-chat-msg-send">' + 'send' + '</div>' + '</form>' + '</div>' + '</div>' + '</div>' + '</div>',
    settable_map: {
      slider_open_time: true,
      slider_close_time: true,
      slider_opened_em: true,
      slider_closed_em: true,
      slider_opened_title: true,
      slider_closed_title: true,

      chat_model: true,
      people_model: true,
      set_chat_anchor: true
    },

    slider_open_time: 250,
    slider_close_time: 250,
    slider_opened_em: 18,
    slider_closed_em: 2,
    slider_opened_min_em: 10,
    window_height_min_em: 20,
    slider_opened_title: 'Вкладка для открытия',
    slider_closed_title: 'Вкладка для закрытия',

    chat_model: null,
    people_model: null,
    set_chat_anchor: null
  },
      stateMap = {
    $append_target: null,
    position_type: 'closed',
    px_per_em: 0,
    slider_hidden_px: 0,
    slider_closed_px: 0,
    slider_opened_px: 0
  },
      jqueryMap = {},
      setJqueryMap,
      setPxSizes,
      scrollChat,
      writeChat,
      writeAlert,
      clearChat,
      setSliderPosition,
      onTapToggle,
      onSubmitMsg,
      onTapList,
      onSetchatee,
      onUpdatechat,
      onListchange,
      onLogin,
      onLogout,
      configModule,
      initModule,
      removeSlider,
      handleResize;
  setJqueryMap = function () {
    var $append_target = stateMap.$append_target,
        $slider = $append_target.find('.spa-chat');

    jqueryMap = {
      $slider: $slider,
      $head: $slider.find('.spa-chat-head'),
      $toggle: $slider.find('.spa-chat-head-toggle'),
      $title: $slider.find('.spa-chat-head-title'),
      $sizer: $slider.find('.spa-chat-sizer'),
      $list_box: $slider.find('.spa-chat-list-box'),
      $msg_log: $slider.find('.spa-chat-msg-log'),
      $msg_in: $slider.find('.spa-chat-msg-in'),
      $input: $slider.find('.spa-chat-msg-in input[type=text]'),
      $send: $slider.find('.spa-chat-msg-send'),
      $form: $slider.find('.spa-chat-msg-form'),
      $window: $(window)
    };
  };
  setPxSizes = function () {
    var px_per_em, window_height_em, opened_height_em;

    px_per_em = spa.util_b.getEmSize(jqueryMap.$slider.get(0));
    window_height_em = Math.floor(jqueryMap.$window.height() / px_per_em + 0.5);

    opened_height_em = window_height_em > configMap.window_height_min_em ? configMap.slider_opened_em : configMap.slider_opened_min_em;

    stateMap.px_per_em = px_per_em;
    stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
    stateMap.slider_opened_px = opened_height_em * px_per_em;
    jqueryMap.$sizer.css({
      height: (opened_height_em - 2) * px_per_em
    });
  };
  handleResize = function () {
    if (!jqueryMap.$slider) {
      return false;
    }

    setPxSizes();
    if (stateMap.position_type === 'opened') {
      jqueryMap.$slider.css({ height: stateMap.slider_opened_px });
    }
    return true;
  };
  setSliderPosition = function (position_type, callback) {
    var height_px, animate_time, slider_title, toggle_text;
    if (position_type === 'opened' && configMap.people_model.get_user().get_is_anon()) {
      return false;
    }
    if (stateMap.position_type === position_type) {
      if (position_type === 'opened') {
        jqueryMap.$input.focus();
      }
      return true;
    }
    switch (position_type) {
      case 'opened':
        height_px = stateMap.slider_opened_px;
        animate_time = configMap.slider_open_time;
        slider_title = configMap.slider_opened_title;
        toggle_text = '=';
        jqueryMap.$input.focus();
        break;
      case 'hidden':
        height_px = 0;
        animate_time = configMap.slider_open_time;
        slider_title = '';
        toggle_text = '+';
        break;
      case 'closed':
        height_px = stateMap.slider_closed_px;
        animate_time = configMap.slider_close_time;
        slider_title = configMap.slider_closed_title;
        toggle_text = '+';
        break;
      default:
        return false;
    };
    stateMap.position_type = '';
    jqueryMap.$slider.animate({
      height: height_px
    }, animate_time, function () {
      jqueryMap.$toggle.prop('title', slider_title);
      jqueryMap.$toggle.text(toggle_text);
      stateMap.position_type = position_type;
      if (callback) {
        callback(jqueryMap.$slider);
      }
    });
    return true;
  };
  scrollChat = function () {
    var $msg_log = jqueryMap.$msg_log;
    $msg_log.animate({ scrollTop: $msg_log.prop('scrollHeight') - $msg_log.height()
    }, 150);
  };
  writeChat = function (person_name, text, is_user) {
    var msg_class = is_user ? 'spa-chat-msg-log-me' : 'spa-chat-msg-log-msg';

    jqueryMap.$msg_log.append('<div class="' + msg_class + '">' + spa.util_b.encodeHtml(person_name) + ': ' + spa.util_b.encodeHtml(text) + '</div>');
    scrollChat();
  };
  writeAlert = function (alert_text) {
    jqueryMap.$msg_log.append('<div class="spa-chat-msg-log-alert">' + spa.util_b.encodeHtml(alert_text) + '</div>');
    scrollChat();
  };
  // Метод clearChat очищяет область сообщений
  clearChat = function () {
    jqueryMap.$msg_log.empty();
  };
  //------------------------- Конец методов Dom ---------------------------------
  //------------------------- Начало обработчиков событий -----------------------
  // Метод сворачивает и разворачивает окно чата
  onTapToggle = function (event) {
    var set_chat_anchor = configMap.set_chat_anchor;
    if (stateMap.position_type === 'opened') {
      set_chat_anchor('closed');
    } else if (stateMap.position_type === 'closed') {
      set_chat_anchor('opened');
    }return false;
  };
  // Метод фиксирует отправку сообщения. Отправка производится model.chat.send_msg
  onSubmitMsg = function (event) {
    var msg_text = jqueryMap.$input.val();
    if (msg_text.trim() === '') {
      return false;
    }
    configMap.chat_model.send_msg(msg_text);
    jqueryMap.$input.focus();
    //jqueryMap.send.addClass('spa-x-select')
    setTimeout(function () {
      jqueryMap.$send.removeClass('spa-x-select');
    }, 250);
    return false;
  };
  // Метод onTapList обрабатывает выбор собеседника. Установка собеседника chat.set_chatee
  onTapList = function (event) {
    var $tapped = $(event.elem_target),
        chatee_id;
    if (!$tapped.hasClass('spa-chat-list-name')) {
      return false;
    }

    chatee_id = $tapped.attr('data-id');
    if (!chatee_id) {
      return false;
    }

    configMap.chat_model.set_chatee(chatee_id);
    return false;
  };
  // Метод onSetchatee обрадатывает spa-setchatee. Он выделяет нового изменяет заголовок
  onSetchatee = function (event, arg_map) {
    var new_chatee = arg_map.new_chatee,
        old_chatee = arg_map.old_chatee;

    jqueryMap.$input.focus();
    if (!new_chatee) {
      if (old_chatee) {
        writeAlert(old_chatee.name + 'покинул чат');
      } else {
        writeAlert('Ваш друг покинул чат');
      }
      jqueryMap.$title.text('Чат');
      return false;
    }

    jqueryMap.$list_box.find('.spa-chat-list-name').removeClass('spa-x-select').end().find('[data-id=' + arg_map.new_chatee.id + ']').addClass('spa-x-select');

    writeAlert('Теперь болтаем с ' + arg_map.new_chatee.name);
    jqueryMap.$title.text('Общайтесь с ' + arg_map.new_chatee.name);
    return true;
  };
  // Метод onListchange обрабатывает моделью событие spa-listchange
  onListchange = function (event) {
    var list_html = String(),
        people_db = configMap.people_model.get_db(),
        chatee = configMap.chat_model.get_chatee();

    people_db().each(function (person, idx) {
      //console.log(person, idx)
      var select_class = '';
      if (person.get_is_anon() || person.get_is_user()) {
        return true;
      }
      if (chatee && chatee.id === person.id) {
        select_class = ' spa-x-select';
      }
      list_html += '<div class="spa-chat-list-name' + select_class + '" data-id="' + person.id + '">' + spa.util_b.encodeHtml(person.name) + '</div>';
    });
    if (!list_html) {
      list_html = String(), +'<div class="spa-chat-list-note">', +'Болтать в одиночестве-это судьба всех великих душ...<br><br>' + 'В Сети никого нет' + '</div>';
      clearChat();
    }
    jqueryMap.$list_box.html(list_html);
  };
  onUpdatechat = function (event, msg_map) {
    var is_user,
        sender_id = msg_map.sender_id,
        msg_text = msg_map.msg_text,
        chatee = configMap.chat_model.get_chatee() || {},
        sender = configMap.people_model.get_by_cid(sender_id);
    if (!sender) {
      writeAlert(msg_text);
      return false;
    }
    is_user = sender.get_is_user();
    if (!(is_user || sender_id === chatee.id)) {
      configMap.chat_model.set_chatee(sender_id);
    }
    writeChat(sender.name, msg_text, is_user);

    if (is_user) {
      jqueryMap.$input.val('');
      jqueryMap.$input.focus();
    }
  };
  onLogin = function (event, login_user) {
    configMap.set_chat_anchor('opened');
  };
  onLogout = function (event, login_user) {
    configMap.set_chat_anchor('closed');
    jqueryMap.$title.text('Chat');
    clearChat();
  };
  configModule = function (input_map) {
    spa.util.setConfigMap({
      input_map: input_map,
      settable_map: configMap.settable_map,
      config_map: configMap
    });
    return true;
  };
  initModule = function ($append_target) {
    var $list_box;
    stateMap.$append_target = $append_target;
    $append_target.append(configMap.main_html);
    setJqueryMap();
    setPxSizes();

    jqueryMap.$toggle.prop('title', configMap.slider_closed_title);
    jqueryMap.$head.click(onTapToggle);
    stateMap.position_type = 'closed';

    $list_box = jqueryMap.$list_box;
    $.gevent.subscribe($list_box, 'spa-listchange', onListchange);
    $.gevent.subscribe($list_box, 'spa-setchatee', onSetchatee);
    $.gevent.subscribe($list_box, 'spa-updatechat', onUpdatechat);
    $.gevent.subscribe($list_box, 'spa-login', onLogin);
    $.gevent.subscribe($list_box, 'spa-logout', onLogout);

    jqueryMap.$head.bind('utap', onTapToggle);
    jqueryMap.$list_box.bind('utap', onTapList);
    jqueryMap.$send.bind('utap', onSubmitMsg);
    jqueryMap.$form.bind('submit', onSubmitMsg);
    return true;
  };
  removeSlider = function () {
    if (jqueryMap.$slider) {
      jqueryMap.$slider.remove();
      jqueryMap = {};
    }
    stateMap.$append_target = null;
    stateMap.position_type = 'closed';

    configMap.chat_model = null;
    configMap.people_model = null;
    configMap.set_chat_anchor = null;

    return true;
  };
  return {
    setSliderPosition: setSliderPosition,
    configModule: configModule,
    initModule: initModule,
    removeSlider: removeSlider,
    handleResize: handleResize
  };
}();
console.log('spa.chat', spa.chat);

// Тестирование модуля chat
/*
var $t = $('<div/>')

$.gevent.subscribe($t, 'spa-login', function () {
  console.log('Hello!', arguments)
})

$.gevent.subscribe($t, 'spa-listchange', function() {
  console.log('*Listchange', arguments)
})

var currentUser = spa.model.people.get_user()

currentUser.get_is_anon()

spa.model.chat.join()

spa.model.people.login('Fred')

var peopleDb = spa.model.people.get_db()
peopleDb().each(function(person,idx) {console.log(person.name)})


 */
spa.data = function () {}();
console.log('spa.data', spa.data);
spa.fake = function () {
  'use script';

  var peopleList, /*getPeopleList,*/fakeIdSerial, makeFakeId, mockSio;

  fakeIdSerial = 5;

  makeFakeId = function () {
    return 'id_' + String(fakeIdSerial++);
  };
  peopleList = [{
    name: 'Вика', _id: 'id_01',
    css_map: {
      'top': 20, left: 20,
      'background-color': 'rgb(128,128,128)'
    }
  }, {
    name: 'Макс', _id: 'id_02',
    css_map: {
      'top': 60, left: 20,
      'background-color': 'rgb(128,255,128)'
    }
  }, {
    name: 'Петя', _id: 'id_03',
    css_map: {
      'top': 100, left: 20,
      'background-color': 'rgb(128,192,192)'
    }
  }, {
    name: 'Настя', _id: 'id_04',
    css_map: {
      'top': 140, left: 20,
      'background-color': 'rgb(192,128,128)'
    }
  }];
  mockSio = function () {
    var on_sio,
        emit_sio,
        emit_mock_msg,
        send_listchange,
        listchange_idto,
        callback_map = {};

    on_sio = function (msg_type, callback) {
      callback_map[msg_type] = callback;
    };

    emit_sio = function (msg_type, data) {
      var person_map, i;
      if (msg_type === 'adduser' && callback_map.userupdate) {
        setTimeout(function () {
          person_map = {
            _id: makeFakeId(),
            name: data.name,
            css_map: data.css_map
          };
          peopleList.push(person_map);
          callback_map.userupdate([person_map]);
        }, 3000);
      }
      if (msg_type === 'updatechat' && callback_map.updatechat) {
        setTimeout(function () {
          var user = spa.model.people.get_user();
          callback_map.updatechat([{
            dest_id: user.id,
            dest_name: user.name,
            sender_id: data.dest_id,
            msg_text: 'Спасибо за записку, ' + user.name
          }]);
        }, 2000);
        if (msg_type === 'leavechat') {
          delete callback_map.listchange;
          delete callback_map.updatechat;
          if (listchange_idto) {
            clearTimeout(listchange_idto);
            listchange_idto = undefined;
          }
          send_listchange();
        }
      }
      if (msg_type === 'updateavatar' && callback_map.listchange) {
        for (i = 0; i < peopleList.length; i++) {
          if (peopleList[i]._id === data.person._id) {
            peopleList[i].css_map === data.css_map;
            break;
          }
        }
        callback_map.listchange([peopleList]);
      }
    };

    emit_mock_msg = function () {
      setTimeout(function () {
        var user = spa.model.people.get_user();
        if (callback_map.updatechat) {
          callback_map.updatechat([{
            dest_id: user.id,
            dest_name: user.name,
            sender_id: 'id_04',
            msg_text: 'Привет ' + user.name + '! Настя здесь.'
          }]);
        } else {
          emit_mock_msg();
        }
      }, 8000);
    };

    send_listchange = function () {
      listchange_idto = setTimeout(function () {
        if (callback_map.listchange) {
          callback_map.listchange([peopleList]);
          emit_mock_msg();
          listchange_idto = undefined;
        } else {
          send_listchange();
        }
      }, 1000);
    };

    send_listchange();
    return { emit: emit_sio, on: on_sio };
  }();
  return {
    mockSio: mockSio
  };
}();
console.log('spa.fake', spa.fake);
spa.model = function () {
  'use script';

  var configMap = { anon_id: 'a0' },
      stateMap = {
    anon_user: null,
    cid_serial: 0,
    people_cid_map: {},
    people_db: TAFFY(),
    user: null,
    is_connected: false
  },
      isFakeData = true,
      personProto,
      makeCid,
      clearPeopleDb,
      completeLogin,
      makePerson,
      removePerson,
      people,
      chat,
      initModule;

  personProto = {
    get_is_user: function () {
      return this.cid === stateMap.user.cid;
    },
    get_is_anon: function () {
      return this.cid === stateMap.anon_user.cid;
    }
  };
  makeCid = function () {
    return 'c' + String(stateMap.cid_serial++);
  };
  clearPeopleDb = function () {
    var user = stateMap.user;
    stateMap.people_db = TAFFY();
    stateMap.people_cid_map = {};
    if (user) {
      stateMap.people_db.insert(user);
      stateMap.people_cid_map[user.cid] = user;
    }
  };
  completeLogin = function (user_list) {
    var user_map = user_list[0];
    delete stateMap.people_cid_map[user_map.cid];
    stateMap.user.cid = user_map._id;
    stateMap.user.id = user_map._id;
    stateMap.user.css_map = user_map.css_map;
    stateMap.people_cid_map[user_map._id] = stateMap.user;
    chat.join();
    $.gevent.publish('spa-login', [stateMap.user]);
  };
  makePerson = function (person_map) {
    var person,
        cid = person_map.cid,
        css_map = person_map.css_map,
        id = person_map.id,
        name = person_map.name;
    if (cid === undefined || !name) {
      throw 'требуется идентификатор клиента и имя';
    }

    person = Object.create(personProto);
    person.cid = cid;
    person.name = name;
    person.css_map = css_map;

    if (id) {
      person.id = id;
    }

    stateMap.people_cid_map[cid] = person;
    stateMap.people_db.insert(person);
    return person;
  };
  /*removePerson = function(person) {
    if(! person) {return false}
    if(person.id === configMap.anon_id) {
      return false
    }
    stateMap.people_db({cid: person.cid}).remove()
    if(person.cid) {
      delete stateMap.people_cid_map[person.cid]
    }
    return true
  }*/
  people = function () {
    var get_by_cid, get_db, get_user, login, logout;
    get_by_cid = function (cid) {
      return stateMap.people_cid_map[cid];
    };
    get_db = function () {
      return stateMap.people_db;
    };
    get_user = function () {
      return stateMap.user;
    };

    login = function (name) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

      stateMap.user = makePerson({
        cid: makeCid(),
        css_map: { top: 25, left: 25, 'background-color': '#88ff88' },
        name: name
      });

      sio.on('userupdate', completeLogin);

      sio.emit('adduser', {
        cid: stateMap.user.cid,
        css_map: stateMap.user.css_map,
        name: stateMap.user.name
      });
    };
    logout = function () {
      var user = stateMap.user;
      chat._leave();

      stateMap.user = stateMap.anon_user;
      clearPeopleDb();

      $.gevent.publish('spa-logout', [user]);
    };
    return {
      get_by_cid: get_by_cid,
      get_db: get_db,
      get_user: get_user,
      login: login,
      logout: logout
    };
  }();

  chat = function () {
    var _publish_listchange,
        _publish_updatechat,
        _update_list,
        _leave_chat,
        join_chat,
        get_chatee,
        send_msg,
        set_chatee,
        update_avatar,
        chatee = null;

    _publish_listchange = function (arg_list) {
      _update_list(arg_list);
      $.gevent.publish('spa-listchange', [arg_list]);
    };
    _update_list = function (arg_list) {
      var i,
          person_map,
          make_person_map,
          person,
          people_list = arg_list[0],
          is_chatee_online = false;

      clearPeopleDb();
      PERSON: for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];
        if (!person_map.name) {
          continue PERSON;
        }
        if (stateMap.user && stateMap.user.id === person_map._id) {
          stateMap.user.css_map = person_map.css_map;
          continue PERSON;
        }
        make_person_map = {
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        };
        person = makePerson(make_person_map);

        if (chatee && chatee.id === make_person_map.id) {
          is_chatee_online = true;
          chatee = person;
        }
      }

      stateMap.people_db.sort('name');
      if (chatee && !is_chatee_online) {
        set_chatee('');
      }
    };
    _publish_updatechat = function (arg_list) {
      var msg_map = arg_list[0];

      if (!chatee) {
        set_chatee(msg_map.sender_id);
      } else if (msg_map.sender_id !== stateMap.user.id && msg_map.sender_id !== chatee.id) {
        set_chatee(msg_map.sender_id);
      }

      $.gevent.publish('spa-updatechat', [msg_map]);
    };
    _leave_chat = function () {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      chatee = null;
      stateMap.is_connected = false;
      if (sio) {
        sio.emit('leavechat');
      }
    };

    get_chatee = function () {
      return chatee;
    };

    join_chat = function () {
      var sio;
      if (stateMap.is_connected) {
        return false;
      }
      if (stateMap.user.get_is_anon()) {
        console.warn('Пользователь должен быть определен перед присоединением к каналу');
        return false;
      }
      sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      sio.on('listchange', _publish_listchange);
      sio.on('updatechat', _publish_updatechat);
      stateMap.is_connected = true;
      return true;
    };
    send_msg = function (msg_text) {
      var msg_map,
          sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

      if (!sio) {
        return false;
      }
      if (!(stateMap.user && chatee)) {
        return false;
      }

      msg_map = {
        dest_id: chatee.id,
        dest_name: chatee.name,
        sender_id: stateMap.user.id,
        msg_text: msg_text
      };

      _publish_updatechat([msg_map]);
      sio.emit('updatechat', msg_map);
      return true;
    };
    set_chatee = function (person_id) {
      var new_chatee;
      new_chatee = stateMap.people_cid_map[person_id];
      if (new_chatee) {
        if (chatee && chatee.id === new_chatee.id) {
          return false;
        }
      } else {
        new_chatee = null;
      }

      $.gevent.publish('spa-setchatee', { old_chatee: chatee, new_chatee: new_chatee });
      chatee = new_chatee;
      return true;
    };
    update_avatar = function (avatar_update_map) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      if (sio) {
        sio.emit('updateavatar', avatar_update_map);
      }
    };
    return {
      _leave: _leave_chat,
      get_chatee: get_chatee,
      join: join_chat,
      send_msg: send_msg,
      set_chatee: set_chatee,
      update_avatar: update_avatar
    };
  }();
  initModule = function () {
    var i, people_list, person_map;

    stateMap.anon_user = makePerson({
      cid: configMap.anon_id,
      id: configMap.anon_id,
      name: 'anonymous'
    });
    stateMap.user = stateMap.anon_user;

    if (isFakeData) {
      //people_list = spa.fake.getPeopleList()
      people_list = spa.fake.mockSio;
      for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];
        makePerson({
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        });
      }
    }
  };
  return {
    initModule: initModule,
    chat: chat,
    people: people
  };
}();
console.log('spa.model', spa.model);
spa.shell = function () {
  'use script';

  var configMap = {
    anchor_schema_map: {
      chat: { opened: true, closed: true }
    },
    resize_interval: 200,
    main_html: String() + '<div class="spa-shell-head">' + '<div class="spa-shell-head-logo">' + '<h1>SPA</h1>' + '<p>javascript end to end</p>' + '</div>' + '<div class="spa-shell-head-acct">Тест</div>' + '</div>' + '<div class="spa-shell-main spa-x-closed">' + '<div class="spa-shell-main-nav"></div>' + '<div class="spa-shell-main-content"></div>' + '</div>' + '<div class="spa-shell-foot"></div>' + '<div class="spa-shell-modal"></div>'
  },
      stateMap = {
    $container: undefined,
    anchor_map: {},
    resize_idto: undefined
  },
      jqueryMap = {},
      copyAnchorMap,
      setJqueryMap,
      changeAnchorPart,
      onHashchange,
      onResize,
      onTapAcct,
      onLogin,
      onLogout,
      setChatAnchor,
      initModule;
  onResize = function () {
    if (stateMap.resize_idto) {
      return true;
    }
    spa.chat.handleResize();
    stateMap.resize_idto = setTimeout(function () {
      stateMap.resize_idto = undefined;
    }, configMap.resize_interval);
    return true;
  };
  //Возвращаем копию сохраненного хэша якорей
  copyAnchorMap = function () {
    return $.extend(true, {}, stateMap.anchor_map);
  };
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container: $container,
      $acct: $container.find('.spa-shell-head-acct'),
      $nav: $container.find('.spa-shell-main-nav')
    };
  };
  changeAnchorPart = function (arg_map) {
    var anchor_map_revise = copyAnchorMap(),
        bool_return = true,
        key_name,
        key_name_dep;
    KEYVAL: for (key_name in arg_map) {
      if (arg_map.hasOwnProperty(key_name)) {
        if (key_name.indexOf('_') === 0) {
          continue KEYVAL;
        }

        anchor_map_revise[key_name] = arg_map[key_name];

        key_name_dep = '_' + key_name;
        if (arg_map[key_name_dep]) {
          anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
        } else {
          delete anchor_map_revise[key_name_dep];
          delete anchor_map_revise['_s' + key_name_dep];
        }
      }
    }
    try {
      $.uriAnchor.setAnchor(anchor_map_revise);
    } catch (error) {
      $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
      bool_return = false;
    }
    return bool_return;
  };
  onHashchange = function (event) {
    var _s_chat_previous,
        _s_chat_proposed,
        s_chat_proposed,
        anchor_map_proposed,
        is_ok = true,
        anchor_map_previous = copyAnchorMap();

    try {
      anchor_map_proposed = $.uriAnchor.makeAnchorMap();
    } catch (error) {
      $.uriAnchor.setAnchor(anchor_map_previous, null, true);
      return false;
    }
    stateMap.anchor_map = anchor_map_proposed;

    _s_chat_previous = anchor_map_previous._s_chat;
    _s_chat_proposed = anchor_map_proposed._s_chat;

    if (!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
      s_chat_proposed = anchor_map_proposed.chat;
      switch (s_chat_proposed) {
        case 'opened':
          is_ok = spa.chat.setSliderPosition('opened');
          break;
        case 'closed':
          is_ok = spa.chat.setSliderPosition('closed');
          break;
        default:
          is_ok = spa.chat.setSliderPosition('closed');
          delete anchor_map_proposed.chat;
          $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
      }
    }
    if (!is_ok) {
      if (anchor_map_previous) {
        $.uriAnchor.setAnchor(anchor_map_previous, null, true);
        stateMap.anchor_map = anchor_map_previous;
      } else {
        delete anchor_map_proposed.chat;
        $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
      }
    }
    return false;
  };
  setChatAnchor = function (position_type) {
    return changeAnchorPart({ chat: position_type });
  };
  /*onClickChat = function( event ) {
    changeAnchorPart({
      chat : ( stateMap.is_chat_retracted ? 'open' : 'closed')
    })
    //toggleChat(stateMap.is_chat_retracted)
    return false
  }*/
  onTapAcct = function (event) {
    var acct_text,
        user_name,
        user = spa.model.people.get_user();
    if (user.get_is_anon()) {
      user_name = prompt('Пожалуйста, войдите в систему');
      spa.model.people.login(user_name);
      jqueryMap.$acct.text('... обработка ...');
    } else {
      spa.model.people.logout();
    }
    return false;
  };
  onLogin = function (event, login_user) {
    jqueryMap.$acct.text(login_user.name);
  };
  onLogout = function (event, logout_user) {
    jqueryMap.$acct.text('Пожалуйста, войдите в систему');
  };
  initModule = function ($container) {
    stateMap.$container = $container;
    $container.html(configMap.main_html);
    setJqueryMap();

    //stateMap.is_chat_retracted = true
    //jqueryMap.$chat.attr('title', configMap.chat_retracted_title).click(onClickChat)
    $.uriAnchor.configModule({
      schema_map: configMap.anchor_schema_map
    });
    spa.chat.configModule({
      set_chat_anchor: setChatAnchor,
      chat_model: spa.model.chat,
      people_model: spa.model.people
    });
    spa.chat.initModule(jqueryMap.$container);
    $(window).bind('resize', onResize).bind('hashchange', onHashchange).trigger('hashchange');

    $.gevent.subscribe($container, 'spa-login', onLogin);
    $.gevent.subscribe($container, 'spa-logout', onLogout);
    jqueryMap.$acct.text('Пожалуйста, войдите в систему').bind('utap', onTapAcct);
  };
  return { initModule: initModule };
}();
console.log('spa.shell', spa.shell);
spa.util_b = function () {
  'use strict';

  var configMap = {
    regex_encode_html: /[&"'><]/g,
    regex_encode_noamp: /["'><]/g,
    html_encode_map: {
      '&': '&#38;',
      '"': '&#34;',
      "'": '&#39;',
      '>': '&#62;',
      '<': '&#60;'
    }
  },
      decodeHtml,
      encodeHtml,
      getEmSize;
  configMap.encode_noamp_map = $.extend({}, configMap.html_encode_map);
  delete configMap.encode_noamp_map['&'];

  decodeHtml = function (str) {
    return $('<div/>').html(str || '').text();
  };

  encodeHtml = function (input_arg_str, exclude_amp) {
    var input_str = String(input_arg_str),
        regex,
        lookup_map;

    if (exclude_amp) {
      lookup_map = configMap.encode_noamp_map;
      regex = configMap.regex_encode_noamp;
    } else {
      lookup_map = configMap.html_encode_map;
      regex = configMap.regex_encode_html;
    }
    return input_str.replace(regex, function (match, name) {
      return lookup_map[match] || '';
    });
  };
  getEmSize = function (elem) {
    return Number(getComputedStyle(elem, '').fontSize.match(/\d*\.?\d*/)[0]);
  };
  return {
    decodeHtml: decodeHtml,
    encodeHtml: encodeHtml,
    getEmSize: getEmSize
  };
}();
console.log('spa.util_b', spa.util_b);
spa.util = function () {
  var makeError, setConfigMap;
  makeError = function (name_text, msg_text, data) {
    var error = new Error();
    error.name = name_text;
    error.message = msg_text;

    if (data) {
      error.data = data;
    }

    return error;
  };
  setConfigMap = function (arg_map) {
    var input_map = arg_map.input_map,
        settable_map = arg_map.settable_map,
        config_map = arg_map.config_map,
        key_name,
        error;
    for (key_name in input_map) {
      if (input_map.hasOwnProperty(key_name)) {
        if (settable_map.hasOwnProperty(key_name)) {
          config_map[key_name] = input_map[key_name];
        } else {
          error = makeError('Bad Input', 'Setting config key |' + key_name + '| is not supported');
          throw error;
        }
      }
    }
  };
  return {
    makeError: makeError,
    setConfigMap: setConfigMap
  };
}();
console.log('spa.util', spa.util);
//# sourceMappingURL=app.js.map
