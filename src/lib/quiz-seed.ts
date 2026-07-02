import type { QuizCategory, QuizDifficulty } from "@/types/quiz";

export const QUIZ_BASE_POINTS = 10;
export const QUIZ_SPEED_BONUS = 5;
export const QUIZ_TIMER_SECONDS = 20;

export const QUIZ_CATEGORY_META: Record<QuizCategory, { emoji: string; label: string }> = {
  istanbul: { emoji: "🕌", label: "Istanbul" },
  turquie: { emoji: "🇹🇷", label: "Turquie" }
};

export const QUIZ_DIFFICULTY_META: Record<QuizDifficulty, { emoji: string; label: string }> = {
  easy: { emoji: "🟢", label: "Facile" },
  medium: { emoji: "🟠", label: "Moyen" },
  hard: { emoji: "🔴", label: "Difficile" }
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
    question: "Quel était le premier nom connu d'Istanbul ?",
    answers: ["Troie", "Byzance", "Éphèse", "Nicée"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Vers quelle année Byzance a-t-elle été fondée par des colons grecs ?",
    answers: ["657 av. J.-C.", "1453", "330", "1071"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Quel empereur romain fit de la ville la nouvelle capitale de l'Empire romain en 330 ?",
    answers: ["Constantin Ier (Constantin le Grand)", "Hadrien", "Théodose Ier", "Justinien Ier"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel nom reçut la ville après sa refondation par Constantin ?",
    answers: ["Alexandrie", "Constantinople", "Pergame", "Smyrne"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Sur quels deux continents Istanbul est-elle située ?",
    answers: ["L'Europe et l'Asie", "L'Europe et l'Afrique", "L'Asie et l'Afrique", "L'Europe et l'Amérique"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel détroit sépare la partie européenne de la partie asiatique d'Istanbul ?",
    answers: ["Le Bosphore", "Le Danube", "Le Dardanelles", "La Corne d'Or"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel empire avait Constantinople pour capitale avant 1453 ?",
    answers: ["Empire byzantin", "Empire perse", "Empire mongol", "Empire britannique"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "En quelle année Constantinople fut-elle conquise par les Ottomans ?",
    answers: ["1453", "1204", "1071", "1520"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel sultan ottoman conquit Constantinople ?",
    answers: ["Mehmed II (Mehmed le Conquérant)", "Suleiman le Magnifique", "Selim Ier", "Bayezid II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Combien de jours dura le siège de Constantinople en 1453 ?",
    answers: ["10", "25", "53", "120"],
    correctAnswer: 2,
    category: "istanbul",
    difficulty: "hard"
  },
  {
    question: "Quelle immense église fut transformée en mosquée après la conquête ottomane ?",
    answers: ["Sainte-Sophie (Hagia Sophia)", "Sainte-Irène", "Notre-Dame de Paris", "Basilique Saint-Pierre"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Sous quel empereur byzantin la Sainte-Sophie actuelle fut-elle construite ?",
    answers: ["Justinien Ier", "Constantin Ier", "Théodose II", "Basile II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "En quelle année la Sainte-Sophie actuelle fut-elle achevée ?",
    answers: ["330", "537", "1096", "1453"],
    correctAnswer: 1,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Quel est aujourd'hui le plus grand symbole de l'architecture byzantine à Istanbul ?",
    answers: ["La Sainte-Sophie", "Le palais de Topkapi", "La tour de Galata", "Le palais de Dolmabahçe"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel est le plus grand fleuve de Turquie ?",
    answers: ["Kızılırmak", "Nil", "Danube", "Euphrate"],
    correctAnswer: 0,
    category: "turquie",
    difficulty: "medium"
  },
  {
    question: "Quelle est la capitale actuelle de la Turquie ?",
    answers: ["Istanbul", "Ankara", "Izmir", "Bursa"],
    correctAnswer: 1,
    category: "turquie",
    difficulty: "easy"
  },
  {
    question: "En quelle année la République de Turquie fut-elle fondée ?",
    answers: ["1453", "1914", "1923", "1938"],
    correctAnswer: 2,
    category: "turquie",
    difficulty: "medium"
  },
  {
    question: "Qui est le fondateur de la République de Turquie ?",
    answers: ["Mustafa Kemal Atatürk", "Mehmed II", "Suleiman le Magnifique", "Abdülhamid II"],
    correctAnswer: 0,
    category: "turquie",
    difficulty: "easy"
  },
  {
    question: "Quel palais fut la résidence principale des sultans ottomans pendant plusieurs siècles ?",
    answers: ["Le palais de Topkapi", "Le palais de Dolmabahçe", "Le palais de Yildiz", "Le palais de Beylerbeyi"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Comment s'appelle le grand marché historique d'Istanbul ?",
    answers: ["Le Grand Bazar (Kapalıçarşı)", "Le marché aux épices", "L'Arasta", "Le bazar égyptien"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel bras de mer forme le port naturel historique d'Istanbul ?",
    answers: ["La Corne d'Or (Golden Horn)", "Le Bosphore", "La mer de Marmara", "Les Dardanelles"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Quel célèbre monument possède six minarets ?",
    answers: ["La Mosquée Bleue", "Sainte-Sophie", "La tour de Galata", "Topkapi"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Comment s'appelle la tour médiévale emblématique dominant le quartier de Galata ?",
    answers: ["La tour de Galata", "La tour de Léandre", "La tour de la Vierge", "La tour de Beyazit"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel empire a succédé à l'Empire byzantin à Constantinople après 1453 ?",
    answers: ["L'Empire ottoman", "L'Empire perse", "L'Empire russe", "L'Empire austro-hongrois"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel nom est officiellement adopté pour la ville en 1930 ?",
    answers: ["Istanbul", "Constantinople", "Byzance", "Ankara"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Quel peuple fonda initialement Byzance ?",
    answers: ["Les Grecs", "Les Romains", "Les Ottomans", "Les Perses"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel empereur byzantin était au pouvoir lors de la chute de Constantinople ?",
    answers: ["Constantin XI", "Justinien Ier", "Basile II", "Andronic II"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "hard"
  },
  {
    question: "Quel détroit relie la mer Noire à la mer de Marmara ?",
    answers: ["Le Bosphore", "Le Danube", "Le Nil", "La Méditerranée"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  },
  {
    question: "Quel empire a utilisé Constantinople comme capitale pendant plus de 1 000 ans ?",
    answers: ["L'Empire byzantin", "L'Empire ottoman", "L'Empire romain d'Occident", "L'Empire perse"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "medium"
  },
  {
    question: "Quel bâtiment a été tour à tour église, mosquée, musée puis de nouveau mosquée ?",
    answers: ["La Sainte-Sophie", "Sainte-Irène", "La Mosquée Bleue", "Süleymaniye"],
    correctAnswer: 0,
    category: "istanbul",
    difficulty: "easy"
  }
];
