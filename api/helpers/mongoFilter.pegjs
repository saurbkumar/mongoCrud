{
  // query hooks
  const queryHooks = require('./queryHooks.js');
  // check allowed fields and for every field do the mapping like convert string int in to proper int and so
  const queryMapping = queryHooks.mapping();
  const allowedFieldsMap = {};
  queryMapping.queryFiels.forEach(element => {
    allowedFieldsMap[element.name] = element.type
  });
  const allowedFields = object.keys(allowedFieldsMap);

  function parseBooleanExpression(boolExpression) {
    // here format is 
    /*
    {
   "operator": "and",
   "terms": [
      {
         "field": "aa",
         "operator": "in",
         "value": "'dd'"
      }]
    }    
    */
   for(let term of boolExpression.terms){
    if(!(term.field in allowedFieldsMap)){
      throw { "message": `${term.field} is not allowed to query. ${allowedFields} are allowed fileds`}
    }
    // transform fiels to target value
   }
    return boolExpression;
  }

  function parseSubExpression(subExpression) {
    return subExpression;
  }

  function parseComparison(comparison) {
    return comparison;
  }

  function parseInComparison(inComparison) {
    return inComparison;
  }

}


// Top level rule is Expression
Expression
  = boolExpression:BooleanExpression { return parseBooleanExpression(boolExpression); }
  / subExpression:SubExpression { return parseSubExpression(subExpression); }
  / comparison:Comparison { return parseComparison(comparison); }
  / inComparison:InComparison { return parseInComparison(inComparison); }

// A sub expression is just an expression wrapped in parentheses
SubExpression
  = _ "(" _ innards: Expression _ ")" _ { return innards; }

Comparison
  = field:Term _ operator:(allowedOp) _ value:Term {
      return {
        field: field,
        operator: operator,
        value: value,
      };
    }
    
InComparison
  = field:Term _ operator:(in)  _ "(" _ values:inTerm _ ")" {
      return {
        field: field,
        operator: operator,
        value: values,
      };
    }

BooleanExpression = AND / OR

// AND to take precendence over OR
AND
  = _ left:( OR / SubExpression / Comparison / InComparison ) _ andTerm _ right:( AND / OR / SubExpression / Comparison / InComparison) _ {
    return {
      operator: 'and',
      terms: [ left, right ]
    }
  }

OR
  = _ left:( SubExpression / Comparison /InComparison ) _ orTerm _ right:( OR / SubExpression / Comparison / InComparison ) _ {
    return {
      operator: 'or',
      terms: [ left, right ]
    }
  }

Term
  = "'"? value:$( [0-9a-zA-Z]+ ) "'"? {
      return value;
    }
    
inTerm
  =  value:$(("'"[0-9a-zA-Z]+"'") (",'"[0-9a-zA-Z]+"'")*)  {
      return value;
    }

    

allowedOp = gtEql 
        / gt 
        / lessEql 
        / less 
        / ntEql 
        / eql

orTerm = "or" / "OR"

andTerm = "and" / "AND"

eql = "=" / "eql"

gt = ">" / "gt"

less = "<" / "less"

gtEql = ">=" / "gtEql"

lessEql = "<=" / "lessEql"

ntEql = "!=" / "ntEql"

in = "in" / "IN"

_ "whitespace"
  = [ \t\n\r]*