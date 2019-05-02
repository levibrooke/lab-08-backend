DROP TABLE IF EXISTS location;

CREATE TABLE IF NOT EXISTS location (
  id SERIAL PRIMARY KEY,
  latitude DECIMAL,
  longitude DECIMAL,
  formatted_query VARCHAR(255),
  search_query VARCHAR(255)
);

DROP TABLE IF EXISTS weather;

CREATE TABLE IF NOT EXISTS weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  forecast_time VARCHAR(255)
);

DROP TABLE IF EXISTS events;

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  event_name VARCHAR(255),
  event_date VARCHAR(255),
  summary TEXT
);