const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Event = require("./mdoels/events");
const User = require("./mdoels/User");

const app = express();

app.use(bodyParser.json());

app.use("/graphql", graphqlHTTP({ // 1
  schema: buildSchema(`
    type Event {
      _id: ID!
      title: String!
      description: String!
      price: Float!
      date: String!
    }
    
    type User {
      _id: ID!
      email: String!
      password: String
    }
    
    input EventInput {
      title: String!
      description: String!
      price: Float!
      date: String!
    }
    
    input UserInput {
      email: String!
      password: String!
    }
  
    type RootQuery {
       events: [Event!]!
    }
    
    type RootMutation {
       createEvent(eventInput: EventInput): Event
       createUser(userInput: UserInput): User
    }
    
    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: () => {
      Event
        .find()
        .then(events => {
          return events.map(event => {
            return { ...event.doc, _id: event.doc.id.toString() };
          });
        })
        .catch(e => { throw e; })
    },
    createEvent: (args) => {
      const event = new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: +args.eventInput.price,
        date: new Date(args.eventInput.date),
        creator: "dummyObjectId"
      });
      let createdEvent;
      return event
        .save()
        .then(result => {
          createdEvent = { ...result.doc, _id: result.doc._id.toString() };
          User.findById("dummyObjectId")
        })
        .then(user => {
          if (user) {
            throw new Error("User exists already")
          }
          user.createEvents.push(event);
          return user.save();
        })
        .then(result => {
          return createdEvent;
        })
        .catch(e => {
          console.log(e);
          throw e;
      });
    },
    createUser: (args) => {
      return User
        .findOne({
          email: args.userInput.email
        })
        .then(user => {
          if (!user) {
            throw new Error("User not found.")
          }
          return bcrypt
            .hash(args.userInput.password, 12)
        })
        .then(hashedPassword => {
          const user = new User({
            email: args.userInput.email,
            password: hashedPassword
          });
          return user.save();
        })
        .then(result => {
          return { ...result.doc, password: null, _id: result.id };
        })
        .catch(e => { throw e; })
    }
  },
  graphiql: true
}));

mongoose
  .connect(
  `mongodb+srv://
          ${process.env.MONGO_USER}:
          ${process.env.MONGO_PASSWORD}
          @cluster0-ntrwp.mongodb.net/${process.env.MONGO_DB}?retryWrites=true`
  )
  .then(() => {
    app.listen(3000, () => {
      console.log("Server is running on 3000");
    });
  })
  .catch(e => {
    console.log(e);
  });


// app.listen(3000, () => {
//   console.log("Server is running on 3000");
// });