import type { QuizCategory, QuizDifficulty } from "@/types/quiz";

export const QUIZ_BASE_POINTS = 10;
export const QUIZ_SPEED_BONUS = 5;
export const QUIZ_TIMER_SECONDS = 20;

export const QUIZ_CATEGORY_META: Record<QuizCategory, { emoji: string; label: string }> = {
  istanbul: { emoji: "🕌", label: "Istanbul" },
  turquie: { emoji: "🇹🇷", label: "Turkey" }
};

export const QUIZ_DIFFICULTY_META: Record<QuizDifficulty, { emoji: string; label: string }> = {
  easy: { emoji: "🟢", label: "Easy" },
  medium: { emoji: "🟠", label: "Medium" },
  hard: { emoji: "🔴", label: "Hard" }
};

export type QuizSeedQuestion = {
  question: string;
  answers: [string, string, string, string];
  correctAnswer: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
};

export const ISTANBUL_HISTORY_QUIZ_SEED: QuizSeedQuestion[] = [
  {
    question: "What was the earliest known name of Istanbul?",
    answers: ["Troy", "Byzantium", "Ephesus", "Nicaea"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Around what year was Byzantium founded by Greek colonists?",
    answers: ["657 BC", "1453", "330", "1071"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Which Roman emperor made the city the new capital of the Roman Empire in 330?",
    answers: ["Constantine I (Constantine the Great)", "Hadrian", "Theodosius I", "Justinian I"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "What name did the city receive after Constantine's refounding?",
    answers: ["Alexandria", "Constantinople", "Pergamon", "Smyrna"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "On which two continents does Istanbul lie?",
    answers: ["Europe and Asia", "Europe and Africa", "Asia and Africa", "Europe and America"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which strait separates Istanbul's European and Asian sides?",
    answers: ["The Bosphorus", "The Danube", "The Dardanelles", "The Golden Horn"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which empire had Constantinople as its capital before 1453?",
    answers: ["The Byzantine Empire", "The Persian Empire", "The Mongol Empire", "The British Empire"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "In what year was Constantinople conquered by the Ottomans?",
    answers: ["1453", "1204", "1071", "1520"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which Ottoman sultan conquered Constantinople?",
    answers: ["Mehmed II (Mehmed the Conqueror)", "Suleiman the Magnificent", "Selim I", "Bayezid II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "How many days did the siege of Constantinople last in 1453?",
    answers: ["10", "25", "53", "120"],
    correctAnswer: 2,
    category: "istanbul",
    difficulty: "hard"
  },
  {
    question: "Which great church was converted into a mosque after the Ottoman conquest?",
    answers: ["Hagia Sophia", "Hagia Irene", "Notre-Dame de Paris", "St. Peter's Basilica"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Under which Byzantine emperor was the present Hagia Sophia built?",
    answers: ["Justinian I", "Constantine I", "Theodosius II", "Basil II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "In what year was the present Hagia Sophia completed?",
    answers: ["330", "537", "1096", "1453"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "What is today the greatest symbol of Byzantine architecture in Istanbul?",
    answers: ["Hagia Sophia", "Topkapi Palace", "Galata Tower", "Dolmabahçe Palace"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "What is the longest river in Turkey?",
    answers: ["Kızılırmak", "The Nile", "The Danube", "The Euphrates"],
    correctAnswer: 0,
    category: "turquie",
    difficulty: "medium"
  },
  {
    question: "What is the current capital of Turkey?",
    answers: ["Istanbul", "Ankara", "Izmir", "Bursa"],
    correctAnswer: 1,
    category: "turquie",
    difficulty: "easy"
  },
  {
    question: "In what year was the Republic of Turkey founded?",
    answers: ["1453", "1914", "1923", "1938"],
    correctAnswer: 2,
    category: "turquie",
    difficulty: "medium"
  },
  {
    question: "Who founded the Republic of Turkey?",
    answers: ["Mustafa Kemal Atatürk", "Mehmed II", "Suleiman the Magnificent", "Abdülhamid II"],
    correctAnswer: 0,
    category: "turquie",
    difficulty: "easy"
  },
  {
    question: "Which palace served as the main residence of the Ottoman sultans for centuries?",
    answers: ["Topkapi Palace", "Dolmabahçe Palace", "Yildiz Palace", "Beylerbeyi Palace"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "What is the name of Istanbul's great historic covered market?",
    answers: ["The Grand Bazaar (Kapalıçarşı)", "The Spice Bazaar", "Arasta Bazaar", "The Egyptian Bazaar"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which inlet forms Istanbul's historic natural harbor?",
    answers: ["The Golden Horn", "The Bosphorus", "The Sea of Marmara", "The Dardanelles"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Which famous monument has six minarets?",
    answers: ["The Blue Mosque", "Hagia Sophia", "Galata Tower", "Topkapi Palace"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "What is the name of the iconic medieval tower overlooking the Galata district?",
    answers: ["Galata Tower", "Leander's Tower", "Maiden's Tower", "Beyazit Tower"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which empire succeeded the Byzantine Empire in Constantinople after 1453?",
    answers: ["The Ottoman Empire", "The Persian Empire", "The Russian Empire", "The Austro-Hungarian Empire"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which name was officially adopted for the city in 1930?",
    answers: ["Istanbul", "Constantinople", "Byzantium", "Ankara"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Which people originally founded Byzantium?",
    answers: ["The Greeks", "The Romans", "The Ottomans", "The Persians"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which Byzantine emperor was in power when Constantinople fell?",
    answers: ["Constantine XI", "Justinian I", "Basil II", "Andronicus II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "hard"
  },
  {
    question: "Which strait connects the Black Sea to the Sea of Marmara?",
    answers: ["The Bosphorus", "The Danube", "The Nile", "The Mediterranean"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Which empire used Constantinople as its capital for more than 1,000 years?",
    answers: ["The Byzantine Empire", "The Ottoman Empire", "The Western Roman Empire", "The Persian Empire"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Which building has been, in turn, a church, a mosque, a museum, and a mosque again?",
    answers: ["Hagia Sophia", "Hagia Irene", "The Blue Mosque", "Süleymaniye Mosque"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  }
];
