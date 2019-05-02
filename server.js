'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const { Client } = require('pg');

//set up database
const client = new Client(process.env.DATABASE_URL);
client.connect();

// use environment variable, or, if it's undefined, use 3000 by default
const PORT = process.env.PORT || 3000;

// Constructor for the Location response from API
const Location = function(queryData, res) {
  this.search_query = queryData;
  this.formatted_query = res.results[0].formatted_address;
  this.latitude = res.results[0].geometry.location.lat;
  this.longitude = res.results[0].geometry.location.lng;
};

// Constructor for a DaysWeather.
const DaysWeather = function(forecast, time) {
  this.forecast = forecast;
  this.time = new Date(time * 1000).toDateString();
};

// Function for getting all the daily weather
function getDailyWeather(weatherData) {
  let data = weatherData.daily.data;
  const dailyWeather = data.map(
    element => new DaysWeather(element.summary, element.time)
  );

  return dailyWeather;
}

// Constructor for events
const Event = function(link, name, event_date, summary) {
  this.link = link;
  this.name = name;
  this.event_date = event_date;
  this.summary = summary;
};

// Function for handling errors
function errorHandling(error, status, response) {
  response.status(status).send('Sorry, something went wrong');
}

// Function for getting location from DB or API
function checkDBForLocation(query) {
  let sqlStatement = `SELECT * FROM location WHERE search_query LIKE $1`;
  let values = [query];
  return client.query(sqlStatement, values)
    .then(data => {
      if (data.rowCount > 0) {
        return data.rows[0];
      } else {
        let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        return superagent.get(geocodeURL)
          .then((googleMapsApiResponse) => { // changed from end to then
        
            // create location instance
            const location = new Location(query, googleMapsApiResponse.body);
            let sqlInsertStatement = `INSERT INTO location (latitude, longitude, formatted_query, search_query) VALUES ($1, $2, $3, $4)`;
            let insertVals = [
              location.latitude,
              location.longitude,
              location.formatted_query,
              location.search_query
            ];
            client.query(sqlInsertStatement, insertVals);

            // send location as our response to our frontend
            return location;
          });
      }
    });
}

// express middleware
app.use(cors());
app.use(express.static('./public'));

// express endpoints
app.get('/location', (request, response) => {
  // check for json file
  try {
    let queryData = request.query.data;
    checkDBForLocation(queryData)
      .then(location => {
        response.send(location);
      });
  } catch (error) {
    console.log('There was an error /location path');
    errorHandling(error, 500, 'Sorry, something went wrong.');
  }
});

app.get('/weather', (request, response) => {
  // check for json file
  try {
    let lat = request.query.data.latitude;
    let long = request.query.data.longitude;

    let weatherURL = `https://api.darksky.net/forecast/${
      process.env.WEATHER_API_KEY
    }/${lat},${long}`;
    superagent.get(weatherURL).end((err, weatherData) => {
      let weather = getDailyWeather(weatherData.body);
      response.send(weather);
    });
  } catch (error) {
    console.log('There was an error /weather path');
    errorHandling(error, 500, 'Sorry, something went wrong.');
  }
});

app.get('/events/', (request, response) => {
  try {
    let lat = request.query.data.latitude;
    let long = request.query.data.longitude;

    let eventsURL = `https://www.eventbriteapi.com/v3/events/search?location.latitude=${lat}&location.longitude=${long}&token=${
      process.env.EVENTBRITE_API_KEY
    }`;

    superagent.get(eventsURL).end((err, eventData) => {
      let receivedEvents = eventData.body.events.slice(0, 20);
      const events = receivedEvents.map(data => {
        return new Event(
          data.url,
          data.name.text,
          data.start.local,
          data.description.text
        );
      });

      response.status(200).send(events);
    });
  } catch (error) {
    console.log('There was an error /events path');
    errorHandling(error, 500, 'Sorry, something went wrong.');
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
