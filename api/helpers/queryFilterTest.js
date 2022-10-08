const filter = require('./mongoFilter');

// console.log(filter.parse(`age in ( 'dd')`));
console.log(
  JSON.stringify(filter.parse(`age in ( '23', '45') and address = 'saueabh'`))
);
console.log(JSON.stringify(filter.parse(`address in ( 'dd')`)));
console.log(
  JSON.stringify(filter.parse(`(country in ( 'dd') and address = 'saueabh')`))
);
console.log(
  JSON.stringify(filter.parse(`(country in ( 'dd') and (address = 'saueabh'))`))
);
