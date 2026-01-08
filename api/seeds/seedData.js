const User = require("../models/user")
const mongoose = require('mongoose');
const Quiz = require("../models/quiz");
const Friend = require("../models/friend")
const {connectToDatabase} = require("../db/db")
const admin = require("../lib/firebaseAdmin")
require("dotenv").config();

async function createSeedUser({ username, email, password }) {
  const firebaseUser = await admin.auth().createUser({
    email,
    password
  });
  const user = new User({
    authId: firebaseUser.uid,
    username,
    email
  });
  await user.save();
  return user;
}

async function deleteAllFirebaseUsers(nextPageToken) {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map(user => user.uid);
    if (uids.length > 0) {
      await admin.auth().deleteUsers(uids);
      console.log(`Deleted ${uids.length} users from Firebase Auth`);
    }
    if (listUsersResult.pageToken) {
      await deleteAllFirebaseUsers(listUsersResult.pageToken);
    }
  } catch (error) {
    console.error("Error deleting Firebase users:", error);
  }
}

const seed = async () => {
  try{
    await connectToDatabase();
    console.log("Connected to MongoDB successfully")

    await Quiz.deleteMany({});
    await User.deleteMany({});
    await deleteAllFirebaseUsers();

    const jane = await createSeedUser({
      username: "JaneDoe",
      email: "jane@email.com",
      password: "Password123"
    });
    const alice = await createSeedUser({
      username: "Alice",
      email: "alice@email.com",
      password: "Password123"
    })
    const barney = await createSeedUser({
      username: "Barney",
      email: "barney@email.com",
      password: "Password123"
    })
    console.log("Seed users created")

    await Friend.deleteMany({});

    await Friend.insertMany([
      {
        user1: jane._id,
        user2: alice._id,
        accepted: true
      },
      {
        user1: jane._id,
        user2: barney._id,
        accepted: false
      },
      {
        user1: alice._id,
        user2: barney._id,
        accepted: true
      }
    ])
    console.log("Seed friends created")

    const quizId1 = new mongoose.Types.ObjectId();
    const quizId2 = new mongoose.Types.ObjectId();
    const quizId3 = new mongoose.Types.ObjectId();
    const quizId4 = new mongoose.Types.ObjectId();
    const quizId5 = new mongoose.Types.ObjectId();
    const quizId6 = new mongoose.Types.ObjectId();
    const quizId7 = new mongoose.Types.ObjectId();
    const quizId8 = new mongoose.Types.ObjectId();
    const quizId9 = new mongoose.Types.ObjectId();
    const quizId10 = new mongoose.Types.ObjectId();

    const addAnswerIds = (items) =>
      items.map((item) => ({
        _id: new mongoose.Types.ObjectId(),
        ...item,
      }))

    const quizzes = [
      {
        _id: quizId1,
        title: "Guess the Artist",
        category: "art",
        created_by: jane._id,
        req_to_pass: 3,
        questions: [
          {
            text: "Which of these artists founded the Cubist movement?",
            answers: addAnswerIds([
              { text: "Vincent van Gogh", is_correct: false },
              { text: "Pablo Picasso", is_correct: true },
              { text: "Edward Hopper", is_correct: false },
              { text: "Salvador Dalí", is_correct: false },
            ]),
          },
          {
            text: "Which of these artists drew the 'Vitruvian Man'?",
            answers: addAnswerIds([
              { text: "Leonardo da Vinci", is_correct: true },
              { text: "Caspar David Friedrich", is_correct: false },
              { text: "Vincent van Gogh", is_correct: false },
              { text: "Michelangelo", is_correct: false },
            ]),
          },
          {
            text: "'The Thinker' is a sculpture made by which of these artists?",
            answers: addAnswerIds([
              { text: "Salvador Dalí", is_correct: false },
              { text: "Michelangelo", is_correct: false },
              { text: "Auguste Rodin", is_correct: true },
              { text: "Claude Monet", is_correct: false },
            ]),
          },
          {
            text: "'Nighthawks' is a painting by which artist?",
            answers: addAnswerIds([
              { text: "Caspar David Friedrich", is_correct: false },
              { text: "Edward Hopper", is_correct: true },
              { text: "Edvard Munch", is_correct: false },
              { text: "Vincent van Gogh", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId2,
        title: "The Skeletal System",
        category: "science",
        created_by: alice._id,
        req_to_pass: 3,
        questions: [
          {
            text: "What is the jawbone more formally known as?",
            answers: addAnswerIds([
              { text: "Scapula", is_correct: false },
              { text: "Epiglottis", is_correct: false },
              { text: "Patella", is_correct: false },
              { text: "Mandible", is_correct: true },
            ]),
          },
          {
            text: "Which is the largest bone in the body?",
            answers: addAnswerIds([
              { text: "Tibia", is_correct: false },
              { text: "Femur", is_correct: true },
              { text: "Radius", is_correct: false },
              { text: "Pelvis", is_correct: false },
            ]),
          },
          {
            text: "In what part of the body are the tarsals located?",
            answers: addAnswerIds([
              { text: "Hands", is_correct: false },
              { text: "Feet", is_correct: true },
              { text: "Ribcage", is_correct: false },
              { text: "Legs", is_correct: false },
            ]),
          },
          {
            text: "Which of these is not a bone?",
            answers: addAnswerIds([
              { text: "Scalenus", is_correct: true },
              { text: "Scapula", is_correct: false },
              { text: "Stapes", is_correct: false },
              { text: "Ulna", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId3,
        title: "Thermodynamics",
        category: "science",
        created_by: alice._id,
        req_to_pass: 3,
        questions: [
          {
            text: "What is commonly described as the measure of disorder or randomness?",
            answers: addAnswerIds([
              { text: "Diffusion", is_correct: false },
              { text: "Brownian Motion", is_correct: false },
              { text: "Entropy", is_correct: true },
              { text: "Osmosis", is_correct: false },
            ]),
          },
          {
            text: "Which of these temperatures is known as 'Absolute Zero'?",
            answers: addAnswerIds([
              { text: "-273.15°C", is_correct: true },
              { text: "-197.65°C", is_correct: false },
              { text: "-148.00°C", is_correct: false },
              { text: "-312.55°C", is_correct: false },
            ]),
          },
          {
            text: "'Heat Death' refers to what?",
            answers: addAnswerIds([
              { text: "Minimum Entropy", is_correct: false },
              { text: "Wave Function Collapse", is_correct: false },
              { text: "Thermal Equilibrium", is_correct: true },
              { text: "Stellar Nucleosynthesis", is_correct: false },
            ]),
          },
          {
            text: "How many laws of thermodynamics are there?",
            answers: addAnswerIds([
              { text: "3", is_correct: false },
              { text: "4", is_correct: true },
              { text: "5", is_correct: false },
              { text: "6", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId4,
        title: "Renaissance Art",
        category: "art",
        created_by: jane._id,
        req_to_pass: 3,
        questions: [
          {
            text: "Who painted the ceiling of the Sistine Chapel?",
            answers: addAnswerIds([
              { text: "Donato Bramante", is_correct: false },
              { text: "Auguste Rodin", is_correct: false },
              { text: "Leonardo da Vinci", is_correct: false },
              { text: "Michelangelo", is_correct: true },
            ]),
          },
          {
            text: "Which Italian city was the heart of The Renaissance?",
            answers: addAnswerIds([
              { text: "Venice", is_correct: false },
              { text: "Florence", is_correct: true },
              { text: "Naples", is_correct: false },
              { text: "Rome", is_correct: false },
            ]),
          },
          {
            text: "Which city completes the title of Raphael's painting 'The School of...'?",
            answers: addAnswerIds([
              { text: "Rome", is_correct: false },
              { text: "Athens", is_correct: true },
              { text: "Alexandria", is_correct: false },
              { text: "Sparta", is_correct: false },
            ]),
          },
          {
            text: "Renaissance is the French word for what?",
            answers: addAnswerIds([
              { text: "Rebirth", is_correct: true },
              { text: "Renewal", is_correct: false },
              { text: "Resistance", is_correct: false },
              { text: "Noble", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId5,
        title: "Western Classical Music",
        category: "music",
        created_by: barney._id,
        req_to_pass: 3,
        questions: [
          {
            text: "Which of these periods was the earliest?",
            answers: addAnswerIds([
              { text: "Romantic", is_correct: false },
              { text: "Classical", is_correct: false },
              { text: "Baroque", is_correct: true },
              { text: "Modern", is_correct: false },
            ]),
          },
          {
            text: "Frédéric Chopin belongs to which of these periods?",
            answers: addAnswerIds([
              { text: "Romantic", is_correct: true },
              { text: "Classical", is_correct: false },
              { text: "Baroque", is_correct: false },
              { text: "Modern", is_correct: false },
            ]),
          },
          {
            text: "Which composer is considered to be the 'father of Western music'?",
            answers: addAnswerIds([
              { text: "Wolfgang Amadeus Mozart", is_correct: false },
              { text: "Ludwig van Beethoven", is_correct: false },
              { text: "Antonio Vivaldi", is_correct: false },
              { text: "Johann Sebastian Bach", is_correct: true },
            ]),
          },
          {
            text: "Which pianist is most famously known for his works known as 'Trois Gymnopédies'?",
            answers: addAnswerIds([
              { text: "Frédéric Chopin", is_correct: false },
              { text: "Maurice Ravel", is_correct: false },
              { text: "Claude Debussy", is_correct: false },
              { text: "Erik Satie", is_correct: true },
            ]),
          }
        ],
      },
      {
        _id: quizId6,
        title: "Brazilian History",
        category: "history",
        created_by: alice._id,
        req_to_pass: 3,
        questions: [
          {
            text: "What year did Brazil gain independence from Portugal?",
            answers: addAnswerIds([
              { text: "1814", is_correct: false },
              { text: "1822", is_correct: true },
              { text: "1818", is_correct: false },
              { text: "1815", is_correct: false },
            ]),
          },
          {
            text: "Which of these used to be a Brazilian currency?",
            answers: addAnswerIds([
              { text: "Cruzeiro", is_correct: true },
              { text: "Peso", is_correct: false },
              { text: "Moeda", is_correct: false },
              { text: "Primeiro", is_correct: false },
            ]),
          },
          {
            text: "Which of these cities has never been a Brazilian capital?",
            answers: addAnswerIds([
              { text: "Rio de Janeiro", is_correct: false },
              { text: "São Paulo", is_correct: true },
              { text: "Salvador", is_correct: false },
              { text: "Brasília", is_correct: false },
            ]),
          },
          {
            text: "Which modern country was briefly controlled by the Empire of Brazil?",
            answers: addAnswerIds([
              { text: "Paraguay", is_correct: false },
              { text: "Bolivia", is_correct: false },
              { text: "Uruguay", is_correct: true },
              { text: "Suriname", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId7,
        title: "Cocktails",
        category: "other",
        created_by: jane._id,
        req_to_pass: 3,
        questions: [
          {
            text: "A Negroni is composed of which 3 components?",
            answers: addAnswerIds([
              { text: "Rum - Campari - Vermouth Rosso", is_correct: false },
              { text: "Gin - Campari - Orgeat", is_correct: false },
              { text: "Gin - Campari - Vermouth Rosso", is_correct: true },
              { text: "Rum - Campari - Orgeat", is_correct: false },
            ]),
          },
          {
            text: "Which of these is not a tiki cocktail?",
            answers: addAnswerIds([
              { text: "Tequila Sunrise", is_correct: true },
              { text: "Zombie", is_correct: false },
              { text: "Mai Tai", is_correct: false },
              { text: "Jungle Bird", is_correct: false },
            ]),
          },
          {
            text: "Which of these cocktails uses rum as its base?",
            answers: addAnswerIds([
              { text: "Manhattan", is_correct: false },
              { text: "Caipirinha", is_correct: false },
              { text: "Daiquiri", is_correct: true },
              { text: "Mint Julep", is_correct: false },
            ]),
          },
          {
            text: "Which whiskey is traditionally used in an old fashioned?",
            answers: addAnswerIds([
              { text: "Rye", is_correct: false },
              { text: "Scotch", is_correct: false },
              { text: "Irish", is_correct: false },
              { text: "Bourbon", is_correct: true },
            ]),
          }
        ],
      },
      {
        _id: quizId8,
        title: "History of Coffee",
        category: "history",
        created_by: alice._id,
        req_to_pass: 3,
        questions: [
          {
            text: "In which country does coffee originate?",
            answers: addAnswerIds([
              { text: "Colombia", is_correct: false },
              { text: "Ethiopia", is_correct: true },
              { text: "Brazil", is_correct: false },
              { text: "Kenya", is_correct: false },
            ]),
          },
          {
            text: "The Mocha gets its name from a port in which country?",
            answers: addAnswerIds([
              { text: "Spain", is_correct: false },
              { text: "Lebanon", is_correct: false },
              { text: "Italy", is_correct: false },
              { text: "Yemen", is_correct: true },
            ]),
          },
          {
            text: "In which year did the first coffee house open in London?",
            answers: addAnswerIds([
              { text: "1652", is_correct: true },
              { text: "1650", is_correct: false },
              { text: "1681", is_correct: false },
              { text: "1703", is_correct: false },
            ]),
          },
          {
            text: "Which of these institutions began in a coffee house?",
            answers: addAnswerIds([
              { text: "Royal Opera House", is_correct: false },
              { text: "London Stock Exchange", is_correct: true },
              { text: "Cambridge University", is_correct: false },
              { text: "National Theatre", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId9,
        title: "Bossa Nova",
        category: "music",
        created_by: barney._id,
        req_to_pass: 3,
        questions: [
          {
            text: "Who is considered the 'father of bossa nova'?",
            answers: addAnswerIds([
              { text: "Antônio Carlos Jobim", is_correct: false },
              { text: "Gilberto Gil", is_correct: false },
              { text: "Chico Buarque", is_correct: false },
              { text: "João Gilberto", is_correct: true },
            ]),
          },
          {
            text: "Bossa nova is a relaxed, jazz-infused form of which genre?",
            answers: addAnswerIds([
              { text: "Salsa", is_correct: false },
              { text: "Samba", is_correct: true },
              { text: "Sertanejo", is_correct: false },
              { text: "Flamenco", is_correct: false },
            ]),
          },
          {
            text: "Which of these is considered the first bossa nova hit?",
            answers: addAnswerIds([
              { text: "Corcovado", is_correct: false },
              { text: "Desafinado", is_correct: false },
              { text: "A Garota de Ipanema", is_correct: false },
              { text: "Chega de Saudade", is_correct: true },
            ]),
          },
          {
            text: "Which American artist first brought bossa nova to the United States?",
            answers: addAnswerIds([
              { text: "Charlie Byrd", is_correct: true },
              { text: "Stan Getz", is_correct: false },
              { text: "Miles Davis", is_correct: false },
              { text: "Glenn Miller", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: quizId10,
        title: "Mexican Cuisine",
        category: "other",
        created_by: barney._id,
        req_to_pass: 3,
        questions: [
          {
            text: "Which one of these dishes is not Mexican?",
            answers: addAnswerIds([
              { text: "Chilorios", is_correct: false },
              { text: "Chanclas Poblanas", is_correct: false },
              { text: "Feijoada", is_correct: true },
              { text: "Pozole", is_correct: false },
            ]),
          },
          {
            text: "'Burrito' translates literally to what in English?",
            answers: addAnswerIds([
              { text: "Little Blanket", is_correct: false },
              { text: "Little Donkey", is_correct: true },
              { text: "Little Bird", is_correct: false },
              { text: "Little Boat", is_correct: false },
            ]),
          },
          {
            text: "Which of these is not considered a breakfast dish?",
            answers: addAnswerIds([
              { text: "Desayuno", is_correct: true },
              { text: "Huevos Rancheros", is_correct: false },
              { text: "Mollete", is_correct: false },
              { text: "Chilaquiles", is_correct: false },
            ]),
          },
          {
            text: "Which dish is famously associated with Mexico's Independence celebrations in September?",
            answers: addAnswerIds([
              { text: "Mole Poblano", is_correct: false },
              { text: "Chiles en Nogada", is_correct: true },
              { text: "Barbacoa", is_correct: false },
              { text: "Chanclas Poblanas", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Ancient Egypt - The Comprehensive Test",
        category: "history",
        created_by: jane._id,
        req_to_pass: 6,
        questions: [
          {
            text: "Which pharaoh built the Great Pyramid of Giza?",
            answers: addAnswerIds([
              { text: "Tutankhamun", is_correct: false },
              { text: "Khufu", is_correct: true },
              { text: "Ramesses II", is_correct: false },
              { text: "Cleopatra", is_correct: false },
            ]),
          },
          {
            text: "What was the primary purpose of the pyramids?",
            answers: addAnswerIds([
              { text: "Temples for worship", is_correct: false },
              { text: "Astronomical observatories", is_correct: false },
              { text: "Tombs for pharaohs", is_correct: true },
              { text: "Storage facilities", is_correct: false },
            ]),
          },
          {
            text: "Which god was associated with the afterlife and mummification?",
            answers: addAnswerIds([
              { text: "Ra", is_correct: false },
              { text: "Horus", is_correct: false },
              { text: "Anubis", is_correct: true },
              { text: "Thoth", is_correct: false },
            ]),
          },
          {
            text: "What writing system did the ancient Egyptians use?",
            answers: addAnswerIds([
              { text: "Cuneiform", is_correct: false },
              { text: "Hieroglyphics", is_correct: true },
              { text: "Linear B", is_correct: false },
              { text: "Sanskrit", is_correct: false },
            ]),
          },
          {
            text: "The Rosetta Stone was crucial in deciphering which language?",
            answers: addAnswerIds([
              { text: "Ancient Greek", is_correct: false },
              { text: "Ancient Egyptian", is_correct: true },
              { text: "Coptic", is_correct: false },
              { text: "Aramaic", is_correct: false },
            ]),
          },
          {
            text: "Which female pharaoh ruled Egypt for over 20 years?",
            answers: addAnswerIds([
              { text: "Nefertiti", is_correct: false },
              { text: "Cleopatra", is_correct: false },
              { text: "Hatshepsut", is_correct: true },
              { text: "Nefertari", is_correct: false },
            ]),
          },
          {
            text: "What was the capital of ancient Egypt during the Old Kingdom?",
            answers: addAnswerIds([
              { text: "Thebes", is_correct: false },
              { text: "Alexandria", is_correct: false },
              { text: "Memphis", is_correct: true },
              { text: "Luxor", is_correct: false },
            ]),
          },
          {
            text: "Which pharaoh's tomb was discovered virtually intact in 1922?",
            answers: addAnswerIds([
              { text: "Ramesses II", is_correct: false },
              { text: "Tutankhamun", is_correct: true },
              { text: "Akhenaten", is_correct: false },
              { text: "Seti I", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Impressionism: Masters of Light",
        category: "art",
        created_by: jane._id,
        req_to_pass: 4,
        questions: [
          {
            text: "Which artist painted 'Impression, Sunrise', giving the movement its name?",
            answers: addAnswerIds([
              { text: "Pierre-Auguste Renoir", is_correct: false },
              { text: "Claude Monet", is_correct: true },
              { text: "Edgar Degas", is_correct: false },
              { text: "Camille Pissarro", is_correct: false },
            ]),
          },
          {
            text: "What subject did Edgar Degas famously paint repeatedly?",
            answers: addAnswerIds([
              { text: "Water lilies", is_correct: false },
              { text: "Ballet dancers", is_correct: true },
              { text: "Haystacks", is_correct: false },
              { text: "Cathedrals", is_correct: false },
            ]),
          },
          {
            text: "In which French city did Impressionism primarily develop?",
            answers: addAnswerIds([
              { text: "Lyon", is_correct: false },
              { text: "Marseille", is_correct: false },
              { text: "Paris", is_correct: true },
              { text: "Nice", is_correct: false },
            ]),
          },
          {
            text: "Which Impressionist painter was known for painting outdoor social gatherings?",
            answers: addAnswerIds([
              { text: "Pierre-Auguste Renoir", is_correct: true },
              { text: "Berthe Morisot", is_correct: false },
              { text: "Mary Cassatt", is_correct: false },
              { text: "Alfred Sisley", is_correct: false },
            ]),
          },
          {
            text: "What technique did Impressionists use to capture the effect of light?",
            answers: addAnswerIds([
              { text: "Chiaroscuro", is_correct: false },
              { text: "Impasto", is_correct: false },
              { text: "Broken color and short brushstrokes", is_correct: true },
              { text: "Sfumato", is_correct: false },
            ]),
          },
          {
            text: "Which American artist became closely associated with French Impressionism?",
            answers: addAnswerIds([
              { text: "John Singer Sargent", is_correct: false },
              { text: "Mary Cassatt", is_correct: true },
              { text: "James McNeill Whistler", is_correct: false },
              { text: "Winslow Homer", is_correct: false },
            ]),
          }
        ],
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Space Exploration Milestones",
        category: "science",
        created_by: alice._id,
        req_to_pass: 5,
        questions: [
          {
            text: "Who was the first human in space?",
            answers: addAnswerIds([
              { text: "Neil Armstrong", is_correct: false },
              { text: "Yuri Gagarin", is_correct: true },
              { text: "Alan Shepard", is_correct: false },
              { text: "John Glenn", is_correct: false },
            ]),
          },
          {
            text: "Which spacecraft first landed humans on the Moon?",
            answers: addAnswerIds([
              { text: "Apollo 10", is_correct: false },
              { text: "Apollo 11", is_correct: true },
              { text: "Apollo 12", is_correct: false },
              { text: "Gemini 12", is_correct: false },
            ]),
          },
          {
            text: "What was the first artificial satellite to orbit Earth?",
            answers: addAnswerIds([
              { text: "Explorer 1", is_correct: false },
              { text: "Vanguard 1", is_correct: false },
              { text: "Sputnik 1", is_correct: true },
              { text: "Telstar 1", is_correct: false },
            ]),
          },
          {
            text: "Which rover has been exploring Mars since 2012?",
            answers: addAnswerIds([
              { text: "Spirit", is_correct: false },
              { text: "Opportunity", is_correct: false },
              { text: "Curiosity", is_correct: true },
              { text: "Sojourner", is_correct: false },
            ]),
          },
          {
            text: "What is the name of the telescope launched in 1990 that revolutionized astronomy?",
            answers: addAnswerIds([
              { text: "James Webb Space Telescope", is_correct: false },
              { text: "Hubble Space Telescope", is_correct: true },
              { text: "Spitzer Space Telescope", is_correct: false },
              { text: "Chandra X-ray Observatory", is_correct: false },
            ]),
          },
          {
            text: "Which spacecraft was the first to leave our solar system?",
            answers: addAnswerIds([
              { text: "Pioneer 10", is_correct: false },
              { text: "Voyager 1", is_correct: true },
              { text: "Voyager 2", is_correct: false },
              { text: "New Horizons", is_correct: false },
            ]),
          },
          {
            text: "What year did humans first walk on the Moon?",
            answers: addAnswerIds([
              { text: "1967", is_correct: false },
              { text: "1968", is_correct: false },
              { text: "1969", is_correct: true },
              { text: "1970", is_correct: false },
            ]),
          }
        ],
      }
    ]
    await Quiz.insertMany(quizzes);
    console.log("Seed quizzes created")
    process.exit(0);
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

seed()
