// Copyright 2018, Abhi Nayar, Yale University
// CS + Econ, Class of 2018. All packages used belong
// to their respective owners and are used in accordance
// with their respective licences. This project is
// academic and non-commercial.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This project was made to satisfy the requirements of CPSC 490, Senior Project
// in the Spring of 2018. It was advised by Prof. Guy Wolf (https://math.yale.edu/people/guy-wolf)
// in tandem with Prof. James Aspnes (http://www.cs.yale.edu/homes/aspnes/)

// This is the frontend code for Birth of a Revolution -- A Global Model For Forecasting Political Instability (BoR)
// BoR is an attempt to quantify levels of social unrest around the world using a combination of
// socioeconomic indicators and static models combined with real-time social media data obtained via sentiment analysis
// on Twitter and Tumblr streams. The front-end is a WebGL based visualization allowing anyone to view realtime
// microblog data tagged with sentiment, as well as explore time-series data for 150 countries and their respective
// unrest timelines. For any questions, please contact the author at abhishek.nayar[at]yale[dot]edu

//
//
// === BEGIN CLIENT SIDE CODE ===
//

// Setup a few placeholder vars.
let dotInterval,
globe;

$(document).ready(function() {
  /**
    * @desc Globe initialization function
    *       Initializes globe, fades it in and then starts the bg shift
    *
  */
  const initGlobe = () => {
    // First we hide the globe DOM node
    $('#globe').hide();
    // Get the DOM node for the globe
    let div = document.getElementById('globe');
    // Create an instance of the Globe class
    globe = new Globe(div);
    // Initialize the glove with the Globe API
    globe.init();
    // Now that it's initialized, fade the globe in
    $('#globe').fadeIn(2500);
    // Plus now we can get a cool globe spin effect if we center
    // it on some coords. { lon: -80.7129, lat : 15.0902 } is
    // between N.A. and S.A.
    globe.center({ lon: 41.0, lat : 20.0 }); // Albania
    // Lastly we add slowScroll to #bg
    // This makes the background stars slowly shift across the sky
    // TBH I just got bored of a static background and I think this
    // looks sick... call it my vanity front end side.
    setTimeout(() => {
      $('#bg').addClass('slowScroll')
    }, 2000)
  }
  // Initialize the globe
  initGlobe();

  /**
    * @desc SocketIO setup
    *       This is the place where we setup the stream
    *       and then direct the incoming results to the
    *       appropriate functions...
    *
  */
  let socketURL = 'http://localhost:3000'
  const socketStream = () => {
    const socket = io(socketURL, { forceNew: true });

    socket.on('tweet', (streamData) => {
      console.log('Received streamData: ', streamData);

      // Now we need to update the rest of the UI
      // Update right sidebar
      // Update aggregate sentiment score
      updateTweetStream(streamData);

      // Check if it's one we map,
      // or one we just add to the
      // visual stream and dont map
      if (streamData.coords) {
        // Add it to the map
        // This also updates the left sidebar
        addTweetToMap(streamData);
      }

      if (!dotInterval) {
        dotInterval = setInterval(() => {
          let dotString = $('.dots').html()
          if (dotString.length > 5 || dotString == '&#x23f8;' || dotString.length == 1) dotString = ''
          else dotString+= '. '

          $('.dots').html(dotString);
        }, 300)
      }
    })

    socket.on('disconnect', () => {
      clearInterval(dotInterval);
      $('.dots').html('&#x23f8;')
    })
  }
  // Run the socketStream function
  socketStream();

  /**
    * @desc Update the tweet stream
    *       Add the new tweet to the stream
    *       Update the aggregate sentiment score
    *
  */
  const updateTweetStream = (data) => {
    let tweetText = data.tweet,
    geoString = data.geo,
    sentiment = data.sentiment;

    // First let's construct the tweetText
    // Append geoString and sentiment
    if (tweetText.length > 60) {
      tweetText.substring(0, 57) + '...';
    }
    // Add the geoString to the tweet text
    tweetText += " (From " + geoString + ")";

    // Construct the jquery DOM nodes
    // This is ugly as hell but I'm not reacting WebGL and ThreeJS
    // or dealing with how to learn it right now, besides
    // really not sure that's going to catch on.
    let tweetNode = $("<li class='tweet'></li>"),
    tweetTextNode = $("<span class='text'>" + tweetText + "</span>"),
    tweetSentimentNode = $("<span class='sentiment'>Sentiment:&nbsp;</span>"),
    tweetSentimentDynamic = $("<span class='sentiment-dy'></span>"),
    tweetSentimentScoreDynamic = $("<span class='sentiment-score-dy'>" + sentiment.score.toFixed(2) + "</span>");

    // Update the sentiment text depending on sentiment score
    if (sentiment.score < -0.25) {
      $(tweetSentimentDynamic).text('Negative').addClass('neg')
    } else if (sentiment.score > 0.25) {
      $(tweetSentimentDynamic).text('Positive').addClass('pos')
    } else {
      $(tweetSentimentDynamic).text('Neutral')
    }

    // Append all the DOM nodes and mash them together
    $(tweetSentimentNode).append(tweetSentimentDynamic).append(tweetSentimentScoreDynamic);
    $(tweetNode).append(tweetTextNode).append(tweetSentimentNode);

    // Put le node in le stream
    $('.tweet-list').prepend(tweetNode);
    console.log('Created tweet node: ', tweetNode);

    // Now udpate the aggregate score
    updateAggregateSentiment(sentiment.score);
  }

  /**
    * @desc Update the aggregate sentiment
    *       Keeps track of the running total of tweets
    *       And uses the current aggregate to create new one
    *
  */
  const updateAggregateSentiment = (score) => {
    // Get the current data and parseInt them to make sure they're #'s
    let curAggregate = parseInt($('.agg-sent-dy').text()),
    curTotalTweets = parseInt($('.agg-sent-dy').data('total')),

    newAggregate = ((curAggregate * curTotalTweets) + score) / (curTotalTweets + 1);

    console.log("Updating aggregate sentiment", curAggregate + score, curTotalTweets + 1, newAggregate);

    // Update the text and the data-total
    $('.agg-sent-dy').text(newAggregate.toFixed(2));
    $('.agg-sent-dy').data('total', curTotalTweets+1)
  }

  /**
    * @desc Put the tweet on the map
    *       And ALSO update the left sidebar
    *       NOT all in one function of course but...
    *
  */
  const addTweetToMap = (data) => {
    // Extract the variables from the data
    let tweetText = data.tweet,
    geoString = data.geo,
    coords = data.coords,
    countryCode = data.countryCode,
    sentiment = data.sentiment;

    console.log('Adding tweet to map', tweetText, geoString, coords, countryCode, sentiment);

    // Construct the map data object
    let mapData = {
      color : '#777777',
      lat : coords[0],
      lon : coords[1],
      size : 10
    }

    globe.center(mapData);
    globe.addLevitatingBlock(mapData);

    // Update the left sidebar
    updateCountryData(countryCode);
  }

  /**
    * @desc Update the left sidebar
    *       This calls the restCountry API
    *       And asynchronously returns the data
    *
  */
  const updateCountryData = (countryCode) => {
    // First let's get all the data
    let apiUrl = 'https://restcountries.eu/rest/v2/alpha/' + countryCode;
    // jQuery AJAX the call
    $.ajax({
      dataType: "json",
      url: apiUrl,
      success: handleData,
      error : handleError
    });
  }
  const handleData = (data) => {
    // Extract the variables from the data
    let countryName = data.name,
    flagSrc = data.flag,
    nativeName = data.nativeName,
    population = data.population,
    capital = data.capital,
    region = data.subregion,
    language = data.languages[0].name,
    isoCode = data.alpha3Code,
    currency = data.currencies[0].name,
    gini = data.gini || 101;

    // If country name is too long, replace it with the 3rd alternative spelling
    // IF it exists. This is NOT a great solution just the best one for now.
    if (countryName.length > 22 && data.altSpellings.length >= 3) countryName = data.altSpellings[2]

    // Append the data to the DOM
    $('.left-info .title .title-dy').html(countryName),
    $('.flag').attr('src', flagSrc),
    $('#nativeName .dy-stat').text(nativeName),
    $('#population .dy-stat').text(population),
    $('#capital .dy-stat').text(capital),
    $('#region .dy-stat').text(region),
    $('#language .dy-stat').text(language),
    $('#isoCode .dy-stat').text(isoCode),
    $('#currency .dy-stat').text(currency);

    let giniString = 'NA'
    if (gini < 25) giniString = 'Low'
    else if (gini < 50) giniString = 'Medium'
    else if (gini < 75) giniString = 'High'
    else if (gini <= 100) giniString = 'Ext. High'
    $('#gini .dy-stat').text(giniString);

    updateStatLength();
  }

  const handleError = (xhr, ajaxOptions, thrownError) => {
    alert("An error occured getting the country data! Please contact the developer!")
    console.log(xhr.status, thrownError);
  }

  const updateStatLength = () => {
    $('.dy-stat').each((i, a) => {
      if ($(a).text().length >= 25) $(a).addClass('tiny-stat');
      else if ($(a).text().length >= 17) $(a).addClass('shrink-stat');
      else $(a).removeClass('shrink-stat')
    })
  }
})


// First clear the loader
// $(document).ready(function() {
//   setTimeout(() => {
//     $('#loading-screen').fadeOut(150);
//     setTimeout(() => {
//       firstScene = null;
//       firstRenderer = null;
//       render = null;
//       window.cancelAnimationFrame(animRequest)
//       $('#loading-canvas').remove()
//     }, 150)
//   }, 2400)
// })
