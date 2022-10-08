{
    // query hooks
  const queryHooks = require('./queryHooks.js');
  // check allowed fields and for every field do the mapping like convert string int in to proper int and so
  const queryMapping = queryHooks.mapping();
  const allowedFieldsMap = {};
  queryMapping.queryFiels.forEach((element) => {
    allowedFieldsMap[element.name] = element.type;
  });
  const allowedFields = Object.keys(allowedFieldsMap);
  const allowedDataTypes = Object.values(allowedFieldsMap);
  const validDataTypesArray = ['string', 'int', 'boolean', 'decimal'];
  const validDataTypes = new Set(validDataTypesArray);
  // check for the allowed types in queryHooks allowed type are string, int, boolean
  allowedDataTypes.forEach((element) => {
    if (!(element in validDataTypes)) {
      new Error(
        `Invalid allowed types: ${element}, allowed types are: ${validDataTypesArray}. Stopping server, fix queryhooks file`
      );
    }
  });

  function transformInteger(value) {
    const transformedValue = parseInt(value, 10);
    if (isNaN(transformedValue)) {
      throw {
        message: `${value} is of type int`
      };
    }
    return transformedValue;
  }

  function transformDecimal(value) {
    const transformedValue = parseFloat(value);
    if (isNaN(transformedValue)) {
      throw {
        message: `${value} is of type int`
      };
    }
    return transformedValue;
  }

  function checkAllowedField(field) {
    if (!(field in allowedFieldsMap)) {
      throw {
        message: `${field} is not allowed to query. ${allowedFields} are allowed fileds`
      };
    }
  }

  function transformValue(value, targetFieldName) {
    checkAllowedField(targetFieldName);
    const targetType = allowedFieldsMap[targetFieldName];
    try {
      let transformField;
      switch (targetType) {
        case 'string':
          // do nothing
          transformField = value;
          break;
        case 'int':
          if (Array.isArray(value)) {
            transformField = value.map((element) => transformInteger(element));
          } else {
            transformField = transformInteger(value);
          }
          break;
        case 'decimal':
          if (Array.isArray(value)) {
            transformField = value.map((element) => transformDecimal(element));
          } else {
            transformField = transformDecimal(value);
          }
          break;

        case 'boolean':
          if (Array.isArray(value)) {
            transformField = value.map((element) => {
              // check every element is true and false
              if (element !== 'true' && element !== 'false') {
                throw {
                  message: `${value} is of type boolean and it is neither true nor false`
                };
              }
              return element === 'true';
            });
          } else {
            transformField = value === 'true';
          }
          break;

        default:
          throw {
            message: `${value} is of type unkown, it can be of the following: ${validDataTypesArray}`
          };
      }
      return transformField;
    } catch (error) {
      throw {
        message: error.message || error
      };
    }
  }
  // this is database specific functions, move these out of parser later
  function transformOperator(operator) {
    let transformedOperator;
    switch (operator) {
      case 'OR':
        transformedOperator = '$or';
        break;
      case 'AND':
        transformedOperator = '$and';
        break;
      case '=':
        transformedOperator = '$eq';
        break;
      case '!=':
        transformedOperator = '$ne';
        break;
      case '>':
        transformedOperator = '$gt';
        break;
      case '>=':
        transformedOperator = '$gte';
        break;
      case '<':
        transformedOperator = '$lt';
        break;
      case '<=':
        transformedOperator = '$lte';
        break;
      case 'IN':
        transformedOperator = '$in';
        break;
      case 'NOT IN':
        transformedOperator = '$nin';
        break;

      default:
        break;
    }
    return transformedOperator;
  }
}
// Top level rule is Expression
Expression
  = boolExpression:BooleanExpression { return boolExpression; }
  / comparison:Comparison { return comparison; }
  / inComparison:InComparison { return inComparison; }
  / subExpression:SubExpression { return subExpression; }


// A sub expression is just an expression wrapped in parentheses
SubExpression
  = _ "(" _ innards: Expression _ ")" _ { return innards; }

Comparison
  = field:Field _ operator:(allowedOp) _ value:Term {
    const transformedValue = transformValue(value, field);
    const trandformedOperator = transformOperator(operator);
    const query = {};
    const op = {}
    op[`${trandformedOperator}`] = transformedValue;
    query[`${field}`] = op;
    return query
    }
    
InComparison
  = field:Field _ operator:(inOp)  _ "(" _ value:inTerm _ ")" {
    const transformedValue = transformValue(value, field);
    const trandformedOperator = transformOperator(operator);
    const query = {};
    const op = {}
    op[`${trandformedOperator}`] = transformedValue;
    query[`${field}`] = op;
    return query
    }

BooleanExpression = AND / OR

// AND to take precendence over OR
AND
  = _ left:( OR / SubExpression / Comparison / InComparison ) _ andTerm _ right:( AND / OR / SubExpression / Comparison / InComparison) _ {
    const trandformedOperator = transformOperator("AND");
    const query = {};
    query[`${trandformedOperator}`] = [left, right];
    return query;
  }

OR
  = _ left:( SubExpression / Comparison /InComparison ) _ orTerm _ right:( OR / SubExpression / Comparison / InComparison ) _ {
        const trandformedOperator = transformOperator("OR");
    const query = {};
    query[`${trandformedOperator}`] = [left, right];
    return query;
  }

Field
  = value:$([0-9a-zA-Z]+) {
      return value;
    }
    
Term
  = value:$("'"[0-9a-zA-Z]+ "'") {
      return value.replaceAll("'","").trim();
    }
    
inTerm
  =  value:$(_ ("'"[0-9a-zA-Z. ]+"'") _ ("," _ "'" _ [0-9a-zA-Z. ]+"'")* _)  {
       return value.split(",").map(element => element.replaceAll("'","").trim());
    }

inOp = in / not_in

allowedOp = gtEql 
        / gt 
        / lessEql 
        / less 
        / ntEql 
        / eql

orTerm = "or" { return "OR"; }
        / "OR" 

andTerm = "and" { return "AND"; }
        / "AND" 

eql = "=" 
        / "eql" { return "="; }

gt = ">" 
        / "gt" { return ">" }

less = "<" 
        / "less" { return "<"; }

gtEql = ">=" 
        / "gtEql" { return ">="; }

lessEql = "<=" 
        / "lessEql" { return "<="; }

ntEql = "!=" 
        / "ntEql" { return "!="; }

in = "in" { return "IN"; }
      / "IN"

not_in = "not in" { return "NOT IN"; }
    / "NOT IN" 

_ "whitespace"
  = [ \t\n\r]*