export const CATEGORY_ORDER = [
  'Burgers', 'Wraps', 'Salades', 'Frites & côtés', 'Milkshakes & smoothies',
  'Petit-déjeuner', 'Desserts', 'Boissons chaudes', 'Menu enfant', 'Suggestions',
]

export interface MenuItem {
  cat: string
  name: string
  sig?: boolean
  price: string
  desc: string
  vertus: string
  badges: string[]
}

export const MENU: MenuItem[] = [
  { cat: 'Burgers', name: 'Le Greatlife', sig: true, price: '48 000', desc: "Le burger qui réconcilie gourmandise et conscience : steak bio juteux, cheddar fondant, chutney mangue-ananas, et notre sauce signature.", vertus: "Protéines (bœuf bio), calcium (cheddar), antioxydants et vitamine C (mangue, ananas).", badges: ['omni', 'gluten', 'lactose'] },
  { cat: 'Burgers', name: 'Le Tropical', price: '45 000', desc: "Poulet bio mariné, ananas grillé caramélisé et laitue croquante : une bouffée tropicale à chaque bouchée.", vertus: "Protéines maigres (poulet), broméline de l'ananas qui aide la digestion, vitamine C, fibres.", badges: ['omni', 'gluten'] },
  { cat: 'Burgers', name: 'Le Volcan', price: '46 000', desc: "Pour les amateurs de sensations : steak bio, piment local et sauce piquante pour réveiller les papilles.", vertus: "Protéines, capsaïcine du piment qui stimule le métabolisme, vitamines.", badges: ['omni', 'gluten'] },
  { cat: 'Burgers', name: 'Le Garden', price: '42 000', desc: "Galette de légumes et céréales, avocat crémeux et chutney de papaye : 100% végétal, 100% gourmand.", vertus: "Fibres, acides gras essentiels (avocat), vitamines A & C (papaye), protéines végétales.", badges: ['vege', 'gluten'] },
  { cat: 'Burgers', name: 'Le Safari', price: '44 000', desc: "Poulet bio, beurre de cacahuète onctueux, mangue fraîche et coriandre : un voyage de saveurs inattendu.", vertus: "Protéines, acides gras et protéines végétales (arachide), vitamine C (mangue), antioxydants.", badges: ['omni', 'gluten', 'arachide'] },
  { cat: 'Burgers', name: 'Le Pure', price: '40 000', desc: "Galette 100% végétale, tomate, oignon et sauce corossol : la pureté végétale, sans complexe.", vertus: "Fibres, vitamine C (corossol), antioxydants ; le corossol est réputé pour ses vertus digestives.", badges: ['vege', 'gluten'] },
  { cat: 'Wraps', name: 'Wrap Tropical', price: '38 000', desc: "Poulet bio, mangue juteuse et laitue croquante enroulés dans une galette moelleuse.", vertus: "Protéines maigres, vitamine C, fibres.", badges: ['omni', 'gluten'] },
  { cat: 'Wraps', name: 'Wrap Garden', price: '36 000', desc: "Galette végé, avocat, papaye et coriandre : frais, léger et nourrissant.", vertus: "Acides gras sains, vitamines A & C, fibres.", badges: ['vege', 'gluten'] },
  { cat: 'Wraps', name: 'Wrap Safari', price: '37 000', desc: "Beurre de cacahuète, plantain et salade croquante : énergie durable et plaisir rond.", vertus: "Protéines végétales, potassium (plantain), bonnes graisses.", badges: ['omni', 'gluten', 'arachide'] },
  { cat: 'Salades', name: 'Salade Tropicale', price: '35 000', desc: "Mangue, avocat, ananas et noix de cajou : la fraîcheur tropicale en grand format.", vertus: "Antioxydants, acides gras, broméline (digestion), fibres.", badges: ['vege', 'arachide'] },
  { cat: 'Salades', name: 'Salade Fouta', price: '32 000', desc: "Laitue, tomate locale et oignon dans une vinaigrette de mangue : croquant et vivifiant.", vertus: "Fibres, vitamine C, lycopène (tomate), hydratation.", badges: ['vege'] },
  { cat: 'Salades', name: 'Salade Poulet & Fruits', price: '40 000', desc: "Poulet bio, ananas, papaye et graines : sucré-salé équilibré.", vertus: "Protéines, vitamines A & C, oméga (graines).", badges: ['omni'] },
  { cat: 'Frites & côtés', name: 'Frites de patate douce', sig: true, price: '14 000', desc: "Dorées, croustillantes, naturellement sucrées : la signature Greatlife.", vertus: "Bêta-carotène (vitamine A), fibres, potassium.", badges: [] },
  { cat: 'Frites & côtés', name: 'Frites classiques', price: '12 000', desc: "L'indémodable, version bio.", vertus: "Potassium, fibres (peau conservée).", badges: [] },
  { cat: 'Frites & côtés', name: 'Frites de manioc épicées', price: '13 000', desc: "Croustillantes et relevées, l'âme ouest-africaine.", vertus: "Glucides complexes (énergie), sans gluten, fibres.", badges: [] },
  { cat: 'Frites & côtés', name: 'Wedges de plantain', price: '12 000', desc: "Moelleux dedans, grillés dehors : le plantain dans sa meilleure forme.", vertus: "Potassium, vitamines A & C, fibres.", badges: [] },
  { cat: 'Milkshakes & smoothies', name: 'Mangue fraîche', price: '20 000', desc: "Pur fruit, pur plaisir : la mangue dans sa splendeur.", vertus: "Vitamine C, bêta-carotène, antioxydants.", badges: ['vege'] },
  { cat: 'Milkshakes & smoothies', name: 'Ananas-gingembre', price: '20 000', desc: "La fraîcheur acidulée de l'ananas piquée du gingembre tonifiant.", vertus: "Broméline (digestion), anti-inflammatoire (gingembre), vitamine C.", badges: ['vege'] },
  { cat: 'Milkshakes & smoothies', name: 'Papaye-lait de coco', price: '22 000', desc: "Velouté tropical, doux et crémeux.", vertus: "Papaïne (digestion), acides gras sains, vitamine A.", badges: ['vege'] },
  { cat: 'Milkshakes & smoothies', name: 'Banane-cacao', price: '18 000', desc: "Douceur gourmande au cœur cacao riche.", vertus: "Potassium, magnésium, antioxydants (cacao).", badges: ['vege'] },
  { cat: 'Milkshakes & smoothies', name: 'Corossol', price: '24 000', desc: "Exotique et légèrement acidulé, le corossol vitaminé.", vertus: "Vitamine C, fibres ; réputé antioxydant et digestif.", badges: ['vege'] },
  { cat: 'Milkshakes & smoothies', name: 'Bissap-hibiscus', price: '16 000', desc: "Rouge vif, désaltérant : l'infusion nationale glacée.", vertus: "Antioxydants, hypotenseur naturel, vitamine C.", badges: ['vege'] },
  { cat: 'Petit-déjeuner', name: 'Greatlife Morning', price: '25 000', desc: "Pain brioché bio, beurre de cacahuète et smoothie : le réveil qui donne des ailes.", vertus: "Protéines, bonnes graisses, énergie longue.", badges: ['vege', 'gluten', 'arachide'] },
  { cat: 'Petit-déjeuner', name: 'Pancakes plantain', price: '23 000', desc: "Pancakes moelleux à la banane plantain, nappés de miel local.", vertus: "Potassium, glucides lents, antioxydants (miel).", badges: ['vege', 'gluten'] },
  { cat: 'Petit-déjeuner', name: 'Bol d\'avocat', price: '27 000', desc: "Avocat crémeux, œufs et pain au sésame : le réconfort matinal.", vertus: "Acides gras sains, protéines, fibres.", badges: ['omni', 'gluten'] },
  { cat: 'Petit-déjeuner', name: 'Porridge de mil', price: '20 000', desc: "Mil, fruits tropicaux et miel : chaleur et énergie longue durée.", vertus: "Protéines végétales, magnésium, fibres.", badges: ['vege'] },
  { cat: 'Desserts', name: 'Ananas rôti au miel', price: '15 000', desc: "Caramélisé, fruité, délicieusement simple.", vertus: "Broméline, vitamine C, antioxydants (miel).", badges: ['vege'] },
  { cat: 'Desserts', name: 'Mousse mangue-cardamome', price: '17 000', desc: "Aérienne, parfumée, sans culpabilité.", vertus: "Vitamine C, fibres, digestion (cardamome).", badges: ['vege'] },
  { cat: 'Desserts', name: 'Banane plantain caramélisée', price: '14 000', desc: "Tendre et dorée, la gourmandise naturelle.", vertus: "Potassium, fibres, énergie.", badges: ['vege'] },
  { cat: 'Desserts', name: 'Yaourt bio fruits tropicaux', price: '15 000', desc: "Onctueux et vivant, probiotiques inclus.", vertus: "Probiotiques (flore intestinale), calcium, vitamines.", badges: ['vege', 'lactose'] },
  { cat: 'Boissons chaudes', name: 'Café de Guinée', price: '12 000', desc: "Arômes de la région Forestière, torréfaction maison.", vertus: "Antioxydants, stimulation (caféine).", badges: ['vege'] },
  { cat: 'Boissons chaudes', name: 'Thé vert à la menthe', price: '10 000', desc: "Fraîchement infusé, le rituel réconfortant.", vertus: "Antioxydants (catéchines), digestion.", badges: ['vege'] },
  { cat: 'Boissons chaudes', name: 'Tisane de kinkeliba', price: '11 000', desc: "Plante guinéenne traditionnelle, alliée de la digestion.", vertus: "Digestive, tonique, réputée dépurative.", badges: ['vege'] },
  { cat: 'Boissons chaudes', name: 'Tisane de baobab', price: '12 000', desc: "Fruit du baobab, riche et acidulé.", vertus: "Vitamine C, fibres, fer.", badges: ['vege'] },
  { cat: 'Boissons chaudes', name: 'Tisane gingembre-citron', price: '11 000', desc: "Le grand réconfort tonique, maison.", vertus: "Anti-inflammatoire, immunité (vitamine C), digestion.", badges: ['vege'] },
  { cat: 'Boissons chaudes', name: 'Chocolat chaud cacao', price: '16 000', desc: "Cacao local bio, velours en tasse.", vertus: "Antioxydants, magnésium, réconfort.", badges: ['vege', 'lactose'] },
  { cat: 'Menu enfant', name: 'Greatlife Kids', price: '28 000', desc: "Mini-burger ou galette, frites, smoothie et dessert : le menu complet qui fait grandir.", vertus: "Protéines, calcium, vitamines, énergie équilibrée.", badges: ['omni', 'gluten', 'lactose'] },
  { cat: 'Suggestions', name: 'Burger Forêt de Fouta-Djallon', price: '52 000', desc: "Édition saisonnière à partir des arrivages locaux du moment. Renforce le circuit-court.", vertus: "Dépend des arrivages — fraîcheur et saisonnalité garanties.", badges: ['omni', 'gluten'] },
]
