const { Pool } = require('pg');

const config = {
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
};

const pool = new Pool(config);

pool.connect(() => console.log(`Connected to ${config.database} database`));

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE email = $1;
    `, [email])
    .then(res => (!res.rows) ? null : (res.rows[0]))
    .catch(err => console.log(err.message));
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`
    SELECT *
    FROM users
    WHERE id = $1;
    `, [id])
    .then(res => (!res.rows) ? null : (res.rows[0]))
    .catch(err => console.log(err.message));
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
    `, [user.name, user.email, user.password])
    .then(res => (!res.rows) ? null : (res.rows))
    .catch(err => console.log(err.message));
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
    SELECT *
    FROM reservations
    JOIN properties ON properties.id = property_id
    WHERE guest_id = $1
    LIMIT $2;
    `, [guest_id, limit])
    .then(res => (!res.rows) ? null : (res.rows))
    .catch(err => console.log(err.message));
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  //an owner_id is passed in, only return properties belonging to that owner
  if (options.owner_id) {
    return pool
      .query(`
      SELECT *
      FROM properties
      WHERE owner_id = $1
      LIMIT $2;
      `, [options.owner_id, limit])
      .then(res => res.rows);
  }
  //building query ---------------------------
  const queryParams = [];
  // 1. SELECT, FROM, JOIN
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;
  // 2. WHERE
  //city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  //minimum_price_per_night && maximum_price_per_night
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    queryString += `AND cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
  }
  // 3. GROUP BY
  queryString += `GROUP BY properties.id `;
  // 4. HAVING
  //minimum_rating
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
  }
  // 5. ORDER BY, LIMIT
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  // --------------------------------------------
  return pool.query(queryString, queryParams).then((res => res.rows));
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const { owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night,
    street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms}
    = property;
  
  const queryParams = [owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night * 100,
    street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms];
  
  const queryString = `
  INSERT INTO properties 
  (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;

  return pool.query(queryString, queryParams).then(res => res.rows);
};
exports.addProperty = addProperty;