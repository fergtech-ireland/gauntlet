/* ---------- food, logged in taps rather than sums ----------
   The research on why people stop tracking is unanimous: friction. A 2023 study
   in Appetite found people who called logging "quick and easy" were over three
   times more likely to still be doing it at 90 days. So this is a short list of
   things people actually eat, with a portion stepper, and your own recent items
   at the top. It is not a 20 million item database and does not pretend to be. */
/* ---------- what people here actually eat ----------
   Typical values per the portion named, rounded to the precision that is
   honest for a food that varies between brands and cuts. The reference for
   composition in Ireland is McCance and Widdowson's Composition of Foods
   Integrated Dataset, which the Food Safety Authority of Ireland names as the
   accepted source; branded items vary, so anything off a packet is better
   taken from the packet, which is what "Something not on the list" is for.
   Irish staples are included on purpose: rashers, sausages, black and white
   pudding, soda and brown bread, potatoes every way they are eaten, chowder,
   stew, a pint, a bag of crisps.
   Categories exist so the list can be browsed rather than only searched. */
const FOOD_CATS=[['common','Common foods'],['breakfast','Breakfast'],['meat','Meat and fish'],['sauces','Sauces and condiments'],
  ['carbs','Bread, potatoes and grains'],['veg','Fruit and vegetables'],['dairy','Dairy and eggs'],
  ['meals','Meals and takeaway'],['snacks','Snacks and sweets'],['drinks','Drinks']];
const FOODS=[
  /* breakfast */
  {id:'egg',n:'Egg, large',u:'egg',kcal:78,p:6.3,c:0.6,f:5.3,cat:'breakfast'},
  {id:'eggwhite',n:'Egg whites',u:'100g',kcal:52,p:11,c:0.7,f:0.2,cat:'breakfast'},
  {id:'oats',n:'Porridge oats',u:'50g dry',kcal:190,p:6.5,c:33,f:3.5,cat:'breakfast'},
  {id:'porridge_milk',n:'Porridge made with milk',u:'bowl',kcal:255,p:11,c:38,f:7,cat:'breakfast'},
  {id:'weetabix',n:'Wheat biscuits, 2',u:'2 biscuits',kcal:135,p:4.5,c:26,f:1,cat:'breakfast'},
  {id:'cornflakes',n:'Cornflakes',u:'40g',kcal:150,p:3,c:34,f:0.4,cat:'breakfast'},
  {id:'granola',n:'Granola',u:'50g',kcal:220,p:5,c:29,f:9,cat:'breakfast'},
  {id:'muesli',n:'Muesli, no added sugar',u:'50g',kcal:180,p:5,c:30,f:4,cat:'breakfast'},
  {id:'fullirish',n:'Full Irish breakfast',u:'plate',kcal:820,p:41,c:48,f:50,cat:'breakfast'},
  {id:'rasher',n:'Bacon rasher, grilled',u:'rasher',kcal:70,p:6,c:0,f:5,cat:'breakfast'},
  {id:'sausage',n:'Pork sausage',u:'sausage',kcal:115,p:5,c:5,f:8,cat:'breakfast'},
  {id:'blackpud',n:'Black pudding',u:'slice',kcal:115,p:4.5,c:7,f:7.5,cat:'breakfast'},
  {id:'whitepud',n:'White pudding',u:'slice',kcal:120,p:3,c:10,f:8,cat:'breakfast'},
  {id:'beans',n:'Baked beans',u:'half tin',kcal:150,p:9,c:25,f:0.8,cat:'breakfast'},
  {id:'pancakes',n:'Pancakes, 2',u:'2',kcal:230,p:7,c:30,f:9,cat:'breakfast'},
  {id:'croissant',n:'Croissant',u:'one',kcal:230,p:5,c:24,f:12,cat:'breakfast'},

  /* meat and fish */
  {id:'chicken',n:'Chicken breast, cooked',u:'150g',kcal:250,p:47,c:0,f:6,cat:'meat'},
  {id:'chickenthigh',n:'Chicken thigh, cooked',u:'100g',kcal:210,p:26,c:0,f:11,cat:'meat'},
  {id:'chickenfillet_bd',n:'Breaded chicken fillet',u:'fillet',kcal:280,p:22,c:18,f:13,cat:'meat'},
  {id:'turkey',n:'Turkey breast, cooked',u:'100g',kcal:150,p:30,c:0,f:3,cat:'meat'},
  {id:'mince5',n:'Beef mince, 5% fat, cooked',u:'150g',kcal:250,p:40,c:0,f:9,cat:'meat'},
  {id:'mince20',n:'Beef mince, 20% fat, cooked',u:'150g',kcal:390,p:33,c:0,f:28,cat:'meat'},
  {id:'steak',n:'Steak, lean, cooked',u:'200g',kcal:400,p:58,c:0,f:18,cat:'meat'},
  {id:'porkchop',n:'Pork chop, cooked',u:'chop',kcal:290,p:36,c:0,f:16,cat:'meat'},
  {id:'lamb',n:'Lamb, cooked',u:'150g',kcal:390,p:44,c:0,f:24,cat:'meat'},
  {id:'ham',n:'Ham, sliced',u:'50g',kcal:60,p:9,c:1,f:2,cat:'meat'},
  {id:'bacon_med',n:'Bacon medallions',u:'2',kcal:70,p:12,c:0,f:2.5,cat:'meat'},
  {id:'mackerel',n:'Mackerel, smoked',u:'100g',kcal:310,p:19,c:0,f:26,cat:'meat'},
  {id:'salmon',n:'Salmon fillet, cooked',u:'130g',kcal:280,p:33,c:0,f:16,cat:'meat'},
  {id:'smokedsalmon',n:'Smoked salmon',u:'50g',kcal:90,p:12,c:0,f:4.5,cat:'meat'},
  {id:'cod',n:'Cod or hake, cooked',u:'150g',kcal:145,p:32,c:0,f:1.5,cat:'meat'},
  {id:'tuna',n:'Tuna, tinned in water',u:'tin, 110g',kcal:120,p:27,c:0,f:1,cat:'meat'},
  {id:'sardines',n:'Sardines, tinned',u:'tin',kcal:180,p:21,c:0,f:11,cat:'meat'},
  {id:'prawns',n:'Prawns, cooked',u:'100g',kcal:100,p:22,c:0,f:1,cat:'meat'},
  {id:'fishfingers',n:'Fish fingers, 4',u:'4',kcal:220,p:13,c:19,f:10,cat:'meat'},

  /* Raw weights, because that is how meat is bought and how most people weigh
     it. Meat loses roughly a quarter of its weight cooking, mostly water, so
     100g raw is about 75g on the plate and the numbers per 100g look lower raw
     than cooked. Weigh it whichever way you actually do it, and use the
     matching entry. */
  {id:'chicken_raw',n:'Chicken breast, raw',u:'100g',kcal:106,p:23,c:0,f:1.6,cat:'meat'},
  {id:'chickenthigh_raw',n:'Chicken thigh, raw',u:'100g',kcal:145,p:19,c:0,f:7.5,cat:'meat'},
  {id:'turkey_raw',n:'Turkey breast, raw',u:'100g',kcal:105,p:22,c:0,f:1.5,cat:'meat'},
  {id:'mince5_raw',n:'Beef mince, 5% fat, raw',u:'100g',kcal:130,p:21,c:0,f:5,cat:'meat'},
  {id:'mince20_raw',n:'Beef mince, 20% fat, raw',u:'100g',kcal:250,p:17,c:0,f:20,cat:'meat'},
  {id:'steak_raw',n:'Steak, lean, raw',u:'100g',kcal:135,p:22,c:0,f:5,cat:'meat'},
  {id:'pork_raw',n:'Pork loin, raw',u:'100g',kcal:135,p:21,c:0,f:5.5,cat:'meat'},
  {id:'lamb_raw',n:'Lamb, raw',u:'100g',kcal:200,p:20,c:0,f:13,cat:'meat'},
  {id:'salmon_raw',n:'Salmon fillet, raw',u:'100g',kcal:180,p:20,c:0,f:11,cat:'meat'},
  {id:'cod_raw',n:'Cod or hake, raw',u:'100g',kcal:80,p:18,c:0,f:0.7,cat:'meat'},
  {id:'prawns_raw',n:'Prawns, raw',u:'100g',kcal:75,p:17,c:0,f:0.6,cat:'meat'},
  {id:'mince_turkey_raw',n:'Turkey mince, raw',u:'100g',kcal:150,p:20,c:0,f:7.5,cat:'meat'},

  /* bread, potatoes and grains */
  {id:'brownbread',n:'Brown soda bread',u:'slice',kcal:120,p:4,c:21,f:2.5,cat:'carbs'},
  {id:'wholemeal',n:'Wholemeal bread',u:'slice',kcal:95,p:4.5,c:16,f:1.2,cat:'carbs'},
  {id:'whitebread',n:'White bread',u:'slice',kcal:95,p:3.2,c:18,f:0.9,cat:'carbs'},
  {id:'sourdough',n:'Sourdough',u:'slice',kcal:120,p:4.5,c:23,f:0.8,cat:'carbs'},
  {id:'bagel',n:'Bagel',u:'one',kcal:250,p:10,c:48,f:1.5,cat:'carbs'},
  {id:'wrap',n:'Tortilla wrap',u:'wrap',kcal:180,p:5,c:30,f:4,cat:'carbs'},
  {id:'pitta',n:'Pitta bread',u:'one',kcal:170,p:6,c:33,f:1,cat:'carbs'},
  {id:'roll',n:'Bread roll',u:'roll',kcal:200,p:7,c:38,f:2,cat:'carbs'},
  {id:'potato',n:'Potatoes, boiled',u:'200g',kcal:150,p:3.6,c:34,f:0.2,cat:'carbs'},
  {id:'mash',n:'Mashed potato with butter',u:'200g',kcal:220,p:4,c:32,f:8,cat:'carbs'},
  {id:'roastspuds',n:'Roast potatoes',u:'150g',kcal:220,p:4,c:32,f:8,cat:'carbs'},
  {id:'chips_oven',n:'Oven chips',u:'150g',kcal:250,p:4,c:38,f:9,cat:'carbs'},
  {id:'chips_bag',n:'Chips, takeaway',u:'portion',kcal:600,p:8,c:75,f:29,cat:'carbs'},
  {id:'sweetpot',n:'Sweet potato, baked',u:'200g',kcal:180,p:3,c:41,f:0.3,cat:'carbs'},
  {id:'rice',n:'Rice, cooked',u:'180g',kcal:250,p:5,c:55,f:0.6,cat:'carbs'},
  {id:'ricebrown',n:'Brown rice, cooked',u:'180g',kcal:240,p:5.5,c:50,f:1.8,cat:'carbs'},
  {id:'pasta',n:'Pasta, cooked',u:'200g',kcal:290,p:11,c:58,f:1.6,cat:'carbs'},
  {id:'noodles',n:'Egg noodles, cooked',u:'200g',kcal:260,p:9,c:52,f:2,cat:'carbs'},
  {id:'couscous',n:'Couscous, cooked',u:'150g',kcal:170,p:6,c:35,f:0.4,cat:'carbs'},
  {id:'quinoa',n:'Quinoa, cooked',u:'150g',kcal:180,p:6.5,c:31,f:2.8,cat:'carbs'},

  /* fruit and veg */
  {id:'banana',n:'Banana',u:'medium',kcal:105,p:1.3,c:27,f:0.4,cat:'veg'},
  {id:'apple',n:'Apple',u:'medium',kcal:80,p:0.4,c:21,f:0.2,cat:'veg'},
  {id:'orange',n:'Orange',u:'medium',kcal:65,p:1.2,c:16,f:0.2,cat:'veg'},
  {id:'berries',n:'Berries',u:'100g',kcal:45,p:1,c:10,f:0.3,cat:'veg'},
  {id:'grapes',n:'Grapes',u:'100g',kcal:70,p:0.6,c:17,f:0.2,cat:'veg'},
  {id:'pear',n:'Pear',u:'medium',kcal:85,p:0.5,c:22,f:0.2,cat:'veg'},
  {id:'avocado',n:'Avocado',u:'half',kcal:160,p:2,c:2,f:15,cat:'veg'},
  {id:'broccoli',n:'Broccoli',u:'100g',kcal:35,p:3.5,c:3,f:0.5,cat:'veg'},
  {id:'carrots',n:'Carrots',u:'100g',kcal:35,p:0.7,c:8,f:0.2,cat:'veg'},
  {id:'cabbage',n:'Cabbage',u:'100g',kcal:28,p:1.5,c:5,f:0.2,cat:'veg'},
  {id:'peas',n:'Peas',u:'100g',kcal:80,p:6,c:11,f:0.5,cat:'veg'},
  {id:'saladmix',n:'Mixed salad',u:'bowl',kcal:30,p:1.5,c:4,f:0.4,cat:'veg'},
  {id:'tomato',n:'Tomatoes',u:'100g',kcal:18,p:0.8,c:3,f:0.2,cat:'veg'},
  {id:'mushrooms',n:'Mushrooms',u:'100g',kcal:22,p:3,c:1,f:0.5,cat:'veg'},
  {id:'onion',n:'Onion, cooked',u:'100g',kcal:40,p:1.2,c:8,f:0.2,cat:'veg'},
  {id:'veg_mixed',n:'Mixed vegetables',u:'150g',kcal:70,p:4,c:10,f:0.8,cat:'veg'},
  {id:'beetroot',n:'Beetroot',u:'100g',kcal:45,p:1.7,c:8,f:0.1,cat:'veg'},

  /* dairy and eggs */
  {id:'skyr',n:'Skyr or 0% Greek yoghurt',u:'150g',kcal:90,p:16,c:6,f:0.3,cat:'dairy'},
  {id:'greekyog',n:'Greek yoghurt, 5%',u:'150g',kcal:150,p:9,c:6,f:10,cat:'dairy'},
  {id:'yoghurt_fruit',n:'Fruit yoghurt',u:'pot',kcal:130,p:5,c:20,f:3,cat:'dairy'},
  {id:'milk',n:'Milk, semi skimmed',u:'200ml',kcal:100,p:7,c:9.6,f:3.6,cat:'dairy'},
  {id:'milk_whole',n:'Milk, whole',u:'200ml',kcal:130,p:7,c:9.4,f:7.6,cat:'dairy'},
  {id:'cheddar',n:'Cheddar',u:'30g',kcal:125,p:7.6,c:0.1,f:10.4,cat:'dairy'},
  {id:'lowfatcheese',n:'Reduced fat cheddar',u:'30g',kcal:80,p:9,c:0.2,f:4.5,cat:'dairy'},
  {id:'cottage',n:'Cottage cheese',u:'100g',kcal:98,p:12,c:3,f:4,cat:'dairy'},
  {id:'mozzarella',n:'Mozzarella',u:'50g',kcal:150,p:11,c:0.6,f:11,cat:'dairy'},
  {id:'butter',n:'Butter',u:'10g',kcal:74,p:0.1,c:0.1,f:8.2,cat:'dairy'},
  {id:'cream',n:'Cream',u:'30ml',kcal:100,p:0.6,c:0.8,f:10.5,cat:'dairy'},
  {id:'whey',n:'Whey protein',u:'scoop',kcal:120,p:24,c:3,f:1.5,cat:'dairy'},

  /* meals and takeaway */
  {id:'chickencurry',n:'Chicken curry and rice',u:'plate',kcal:700,p:38,c:85,f:22,cat:'meals'},
  {id:'stew',n:'Irish stew',u:'bowl',kcal:480,p:30,c:40,f:21,cat:'meals'},
  {id:'baconcabbage',n:'Bacon and cabbage with potatoes',u:'plate',kcal:600,p:40,c:45,f:28,cat:'meals'},
  {id:'chowder',n:'Seafood chowder',u:'bowl',kcal:420,p:24,c:28,f:23,cat:'meals'},
  {id:'shepherds',n:"Shepherd's pie",u:'portion',kcal:550,p:30,c:48,f:26,cat:'meals'},
  {id:'lasagne',n:'Lasagne',u:'portion',kcal:600,p:32,c:52,f:29,cat:'meals'},
  {id:'spagbol',n:'Spaghetti bolognese',u:'plate',kcal:620,p:34,c:75,f:20,cat:'meals'},
  {id:'stirfry',n:'Chicken stir fry with noodles',u:'plate',kcal:550,p:40,c:60,f:16,cat:'meals'},
  {id:'chickensalad',n:'Chicken salad',u:'bowl',kcal:380,p:40,c:14,f:18,cat:'meals'},
  {id:'sandwich_chicken',n:'Chicken sandwich',u:'one',kcal:430,p:30,c:42,f:15,cat:'meals'},
  {id:'sandwich_ham',n:'Ham and cheese sandwich',u:'one',kcal:450,p:22,c:41,f:22,cat:'meals'},
  {id:'toastie',n:'Toasted ham and cheese sandwich',u:'one',kcal:520,p:26,c:44,f:27,cat:'meals'},
  {id:'soup',n:'Vegetable soup',u:'bowl',kcal:150,p:4,c:22,f:5,cat:'meals'},
  {id:'chickenroll',n:'Chicken fillet roll',u:'one',kcal:700,p:35,c:75,f:28,cat:'meals'},
  {id:'breakfastroll',n:'Breakfast roll',u:'one',kcal:800,p:32,c:72,f:42,cat:'meals'},
  {id:'pizza',n:'Pizza',u:'half a 12 inch',kcal:640,p:28,c:72,f:26,cat:'meals'},
  {id:'burger_meal',n:'Burger and chips',u:'meal',kcal:950,p:38,c:95,f:46,cat:'meals'},
  {id:'fishchips',n:'Fish and chips',u:'portion',kcal:950,p:38,c:95,f:46,cat:'meals'},
  {id:'chinese_curry',n:'Chinese takeaway curry and rice',u:'portion',kcal:900,p:35,c:110,f:34,cat:'meals'},
  {id:'kebab',n:'Doner kebab',u:'one',kcal:800,p:40,c:70,f:40,cat:'meals'},
  {id:'sushi',n:'Sushi',u:'8 pieces',kcal:350,p:14,c:60,f:5,cat:'meals'},
  {id:'omelette',n:'Three egg omelette',u:'one',kcal:300,p:21,c:2,f:23,cat:'meals'},
  {id:'protein_bowl',n:'Chicken, rice and vegetables',u:'bowl',kcal:600,p:45,c:70,f:13,cat:'meals'},

  /* snacks and sweets */
  {id:'crisps',n:'Crisps',u:'bag',kcal:180,p:2,c:17,f:11,cat:'snacks'},
  {id:'peanuts',n:'Peanuts',u:'30g',kcal:180,p:7.5,c:4,f:15,cat:'snacks'},
  {id:'almonds',n:'Almonds',u:'30g',kcal:180,p:6.4,c:2,f:16,cat:'snacks'},
  {id:'peanutbutter',n:'Peanut butter',u:'tbsp',kcal:95,p:4,c:2.5,f:8,cat:'snacks'},
  {id:'proteinbar',n:'Protein bar',u:'bar',kcal:200,p:20,c:20,f:6,cat:'snacks'},
  {id:'choc_bar',n:'Chocolate bar',u:'standard',kcal:240,p:3,c:28,f:13,cat:'snacks'},
  {id:'biscuits',n:'Biscuits, 2',u:'2',kcal:150,p:2,c:20,f:7,cat:'snacks'},
  {id:'scone',n:'Scone with butter and jam',u:'one',kcal:400,p:7,c:55,f:17,cat:'snacks'},
  {id:'flapjack',n:'Flapjack',u:'one',kcal:320,p:4,c:42,f:15,cat:'snacks'},
  {id:'muffin',n:'Muffin',u:'one',kcal:400,p:6,c:52,f:19,cat:'snacks'},
  {id:'icecream',n:'Ice cream',u:'2 scoops',kcal:200,p:3.5,c:24,f:10,cat:'snacks'},
  {id:'popcorn',n:'Popcorn, salted',u:'bag',kcal:130,p:2,c:17,f:6,cat:'snacks'},
  {id:'ricecakes',n:'Rice cakes, 2',u:'2',kcal:60,p:1.4,c:12,f:0.4,cat:'snacks'},
  {id:'hummus',n:'Hummus',u:'50g',kcal:150,p:4,c:7,f:12,cat:'snacks'},
  {id:'olives',n:'Olives',u:'50g',kcal:75,p:0.5,c:1,f:8,cat:'snacks'},
  {id:'darkchoc',n:'Dark chocolate',u:'25g',kcal:135,p:2,c:11,f:9,cat:'snacks'},

  /* drinks */
  {id:'tea',n:'Tea with milk',u:'mug',kcal:20,p:1,c:2,f:0.8,cat:'drinks'},
  {id:'coffee_black',n:'Coffee, black',u:'mug',kcal:4,p:0.3,c:0.5,f:0,cat:'drinks'},
  {id:'latte',n:'Latte',u:'regular',kcal:150,p:8,c:14,f:7,cat:'drinks'},
  {id:'cappuccino',n:'Cappuccino',u:'regular',kcal:110,p:6,c:10,f:5,cat:'drinks'},
  {id:'oj',n:'Orange juice',u:'200ml',kcal:90,p:1.4,c:20,f:0.2,cat:'drinks'},
  {id:'smoothie',n:'Fruit smoothie',u:'250ml',kcal:150,p:2,c:33,f:0.6,cat:'drinks'},
  {id:'proteinshake',n:'Protein shake with milk',u:'400ml',kcal:270,p:36,c:16,f:6,cat:'drinks'},
  {id:'cola',n:'Cola',u:'330ml can',kcal:139,p:0,c:35,f:0,cat:'drinks'},
  {id:'diet_drink',n:'Diet or zero soft drink',u:'can',kcal:2,p:0,c:0.3,f:0,cat:'drinks'},
  {id:'sportsdrink',n:'Sports drink',u:'500ml',kcal:130,p:0,c:32,f:0,cat:'drinks'},
  {id:'pint_stout',n:'Pint of stout',u:'pint',kcal:210,p:1.8,c:18,f:0,alc:18.8,cat:'drinks'},
  {id:'pint_lager',n:'Pint of lager',u:'pint',kcal:190,p:1.5,c:10,f:0,alc:20.2,cat:'drinks'},
  {id:'wine',n:'Glass of wine',u:'175ml',kcal:140,p:0.2,c:4,f:0,alc:17.9,cat:'drinks'},
  {id:'spirit',n:'Spirit measure',u:'35.5ml',kcal:78,p:0,c:0,f:0,alc:11.2,cat:'drinks'},
  {id:'water',n:'Water',u:'glass',kcal:0,p:0,c:0,f:0,cat:'drinks'},

  /* sauces and condiments: small amounts, but they are where a careful day
     quietly turns into a loose one, so they are worth a tap */
  {id:'ketchup',n:'Tomato ketchup',u:'tbsp',kcal:20,p:0.2,c:4.5,f:0,cat:'sauces'},
  {id:'mayo',n:'Mayonnaise',u:'tbsp',kcal:95,p:0.2,c:0.3,f:10.3,cat:'sauces'},
  {id:'mayo_light',n:'Light mayonnaise',u:'tbsp',kcal:38,p:0.2,c:1.5,f:3.4,cat:'sauces'},
  {id:'brownsauce',n:'Brown sauce',u:'tbsp',kcal:22,p:0.2,c:5,f:0,cat:'sauces'},
  {id:'mustard',n:'Mustard',u:'tsp',kcal:8,p:0.4,c:0.6,f:0.4,cat:'sauces'},
  {id:'bbqsauce',n:'Barbecue sauce',u:'tbsp',kcal:30,p:0.2,c:7,f:0.1,cat:'sauces'},
  {id:'sweetchilli',n:'Sweet chilli sauce',u:'tbsp',kcal:35,p:0.1,c:8.5,f:0,cat:'sauces'},
  {id:'soysauce',n:'Soy sauce',u:'tbsp',kcal:9,p:1.3,c:0.8,f:0,cat:'sauces'},
  {id:'hotsauce',n:'Hot sauce',u:'tsp',kcal:1,p:0.1,c:0.2,f:0,cat:'sauces'},
  {id:'garlicsauce',n:'Garlic sauce',u:'tbsp',kcal:90,p:0.3,c:1,f:9.5,cat:'sauces'},
  {id:'taco_sauce',n:'Taco sauce',u:'tbsp',kcal:45,p:0.3,c:2,f:4,cat:'sauces'},
  {id:'saladcream',n:'Salad cream',u:'tbsp',kcal:52,p:0.3,c:2.5,f:4.5,cat:'sauces'},
  {id:'caesar',n:'Caesar dressing',u:'tbsp',kcal:80,p:0.5,c:0.6,f:8.5,cat:'sauces'},
  {id:'vinaigrette',n:'Oil and vinegar dressing',u:'tbsp',kcal:72,p:0,c:0.6,f:8,cat:'sauces'},
  {id:'pesto',n:'Pesto',u:'tbsp',kcal:80,p:1.5,c:1,f:8,cat:'sauces'},
  {id:'gravy',n:'Gravy',u:'50ml',kcal:25,p:0.5,c:3,f:1.2,cat:'sauces'},
  {id:'currysauce',n:'Chip shop curry sauce',u:'100ml',kcal:90,p:1.5,c:14,f:3,cat:'sauces'},
  {id:'tartare',n:'Tartare sauce',u:'tbsp',kcal:85,p:0.2,c:1.5,f:8.8,cat:'sauces'},
  {id:'sourcream',n:'Sour cream',u:'tbsp',kcal:30,p:0.4,c:0.6,f:2.9,cat:'sauces'},
  {id:'oliveoil',n:'Olive oil',u:'tbsp',kcal:120,p:0,c:0,f:13.5,cat:'sauces'},
  {id:'honey',n:'Honey',u:'tsp',kcal:23,p:0,c:6,f:0,cat:'sauces'},
  {id:'jam',n:'Jam',u:'tsp',kcal:20,p:0,c:5,f:0,cat:'sauces'},
  {id:'chocspread',n:'Chocolate spread',u:'tbsp',kcal:100,p:1,c:11,f:5.8,cat:'sauces'},
  {id:'salsa',n:'Salsa',u:'tbsp',kcal:8,p:0.3,c:1.6,f:0.1,cat:'sauces'}
];
/* The handful almost everyone taps, shown first before anything is logged. */
const FOOD_COMMON=['egg','oats','chicken','rice','potato','brownbread','skyr','banana','milk','tea','whey','apple'];
/* Your own things, saved as you go. The built in list is deliberately short,
   which only works if anything missing from it can be added once and reused. */
const MEALS=[['b','Breakfast'],['l','Lunch'],['d','Dinner'],['s','Snacks']];
const customFoods=()=>Array.isArray(S.customFoods)? S.customFoods : [];
const savedMeals=()=>Array.isArray(S.savedMeals)? S.savedMeals : [];
const allFoods=()=>FOODS.concat(customFoods());
/* ---------- fibre (build 50) ----------
   Grams of dietary fibre per portion, as each food's portion is written. Most
   come from standard food composition tables (McCance and Widdowson, USDA
   FoodData Central), measured the way food labels in Ireland and the UK
   measure it (AOAC). Meat, fish, eggs, dairy and most drinks have none.
   Mixed dishes, takeaways and protein bars vary with the recipe, so those are
   typical values and the app says so.
   The daily target is 30g, the UK SACN recommendation (2015); EFSA's adequate
   intake for adults is 25g. The case for it: a Lancet review of 185
   prospective studies and 58 trials found people eating 25 to 29g a day had
   15 to 30% lower death and heart disease, stroke, type 2 diabetes and bowel
   cancer rates than those eating the least, with more benefit above that
   (Reynolds and colleagues, 2019). Observational for the most part, so an
   association, said as such. */
const FIBRE={shepherds:5,egg:0,eggwhite:0,oats:5,porridge_milk:4,weetabix:3.8,cornflakes:1.2,granola:3,muesli:4,fullirish:6,rasher:0,sausage:0.5,blackpud:0.5,whitepud:0.5,beans:7.5,pancakes:1,croissant:1.5,chicken:0,chickenthigh:0,chickenfillet_bd:0.8,turkey:0,mince5:0,mince20:0,steak:0,porkchop:0,lamb:0,ham:0,bacon_med:0,mackerel:0,salmon:0,smokedsalmon:0,cod:0,tuna:0,sardines:0,prawns:0,fishfingers:0.8,chicken_raw:0,chickenthigh_raw:0,turkey_raw:0,mince5_raw:0,mince20_raw:0,steak_raw:0,pork_raw:0,lamb_raw:0,salmon_raw:0,cod_raw:0,prawns_raw:0,mince_turkey_raw:0,brownbread:2.2,wholemeal:2.5,whitebread:1,sourdough:1.2,bagel:2.5,wrap:2,pitta:2,roll:1.5,potato:3.6,mash:3,roastspuds:2.7,chips_oven:4.2,chips_bag:5.5,sweetpot:6.6,rice:0.7,ricebrown:3.2,pasta:3.6,noodles:2,couscous:2.1,quinoa:4.2,banana:3.1,apple:4.4,orange:3.1,berries:3.5,grapes:0.9,pear:5.5,avocado:5,broccoli:3,carrots:2.8,cabbage:2.5,peas:5.1,saladmix:1.5,tomato:1.2,mushrooms:1,onion:1.4,veg_mixed:4.5,beetroot:2,skyr:0,greekyog:0,yoghurt_fruit:0.3,milk:0,milk_whole:0,cheddar:0,lowfatcheese:0,cottage:0,mozzarella:0,butter:0,cream:0,whey:0,chickencurry:4,stew:4,baconcabbage:6,chowder:1.5,lasagne:2.5,spagbol:5,stirfry:5,chickensalad:3,sandwich_chicken:2.5,sandwich_ham:2.5,toastie:2.5,soup:4,chickenroll:2.5,breakfastroll:3,pizza:5,burger_meal:6,fishchips:6,chinese_curry:3,kebab:4,sushi:1.5,omelette:0,protein_bowl:4,crisps:1.2,peanuts:2.6,almonds:3.8,peanutbutter:1,proteinbar:4,choc_bar:1,biscuits:1.2,scone:1.5,flapjack:2,muffin:1.5,icecream:0.5,popcorn:3.3,ricecakes:0.8,hummus:3,olives:1.6,darkchoc:2.7,tea:0,coffee_black:0,latte:0,cappuccino:0,oj:0.4,smoothie:2,proteinshake:0,cola:0,diet_drink:0,sportsdrink:0,pint_stout:0,pint_lager:0,wine:0,spirit:0,water:0,ketchup:0.1,mayo:0,mayo_light:0,brownsauce:0.2,mustard:0.2,bbqsauce:0.1,sweetchilli:0.1,soysauce:0.1,hotsauce:0,garlicsauce:0,taco_sauce:0.2,saladcream:0,caesar:0,vinaigrette:0,pesto:0.3,gravy:0.1,currysauce:1,tartare:0.1,sourcream:0,oliveoil:0,honey:0,jam:0.1,chocspread:0.6,salsa:0.3};
const FIBRE_ROUGH=new Set(["shepherds","fullirish", "chickencurry", "stew", "baconcabbage", "chowder", "lasagne", "spagbol", "stirfry", "chickensalad", "sandwich_chicken", "sandwich_ham", "toastie", "soup", "chickenroll", "breakfastroll", "pizza", "burger_meal", "fishchips", "chinese_curry", "kebab", "sushi", "protein_bowl", "proteinbar", "saladmix", "smoothie", "berries", "veg_mixed"]);
FOODS.forEach(f=>{ if(FIBRE[f.id]!==undefined) f.fb=FIBRE[f.id]; });
/* a logged item's fibre: its own, else the food's, else unknown */
function fibreOf(x){ if(typeof x.fb==='number') return x.fb; const f=foodOf(x.id); return f&&typeof f.fb==='number'? f.fb : null; }
function fibreInfo(k){
  const items=dayFood(k); let g=0, unknown=0, rough=0;
  items.forEach(x=>{ const v=fibreOf(x); if(v===null) unknown++; else { g+=v*x.q; if(FIBRE_ROUGH.has(x.id)&&v>0) rough++; } });
  return {g:Math.round(g*10)/10, unknown, rough, n:items.length};
}
const foodOf=id=>allFoods().find(f=>f.id===id)||null;
function addCustomFood(f){
  S.customFoods=customFoods().concat([f]); save(); return f;
}
function saveMealAs(name,slot){
  const items=dayFood(todayKey()).filter(x=>(x.meal||'s')===slot);
  if(!items.length) return null;
  const m={id:'sm'+Date.now(),name,slot,items:items.map(x=>({id:x.id,q:x.q}))};
  S.savedMeals=savedMeals().concat([m]); save(); return m;
}
function addSavedMeal(id){
  const m=savedMeals().find(x=>x.id===id); if(!m) return 0;
  m.items.forEach(it=>addFood(it.id,it.q,m.slot));
  return m.items.length;
}
/* The single highest value thing in food logging: most days look like the day
   before, and re-tapping fifteen items is why people stop. */
function repeatYesterday(){
  const y=dayFood(addDays(todayKey(),-1));
  if(!y.length) return 0;
  y.forEach(x=>addFood(x.id,x.q,x.meal||'s'));
  return y.length;
}
function dayFood(k){ const r=S.days[k||todayKey()]; return (r&&Array.isArray(r.food))? r.food : []; }
function foodTotals(k){
  return dayFood(k).reduce((t,x)=>({kcal:t.kcal+x.kcal*x.q, protein:t.protein+x.p*x.q,
    carbs:t.carbs+x.c*x.q, fat:t.fat+x.f*x.q, fibre:t.fibre+(fibreOf(x)||0)*x.q}),{kcal:0,protein:0,carbs:0,fat:0,fibre:0});
}
/* One row per food per meal, with a count, rather than a new row every time
   the same thing is tapped. Two eggs at breakfast is one line that says 2,
   and an egg at lunch is still its own line, so the meal split stays. Saved
   meals and "same as yesterday" go through here too, so they merge the same
   way. The time of the first one is kept, which is when the meal started. */
function addFood(id,q,meal){
  const f=foodOf(id); if(!f) return null;
  const k=todayKey(), m=meal||foodSlot||'s', n=+q||1;
  S.days[k]=S.days[k]||{};
  const list=(S.days[k].food||[]).slice();
  const same=list.find(x=>x.id===f.id&&(x.meal||'s')===m);
  if(same) same.q=+(same.q+n).toFixed(2);
  else { const row={id:f.id,n:f.n,u:f.u,q:n,meal:m,kcal:f.kcal,p:f.p,c:f.c,f:f.f,at:mealAtMs(k,m)}; if(typeof f.fb==='number') row.fb=f.fb; list.push(row); }
  /* eating something in a meal marked skipped means it was not skipped */
  if(S.days[k].skipped&&S.days[k].skipped.indexOf(m)>=0) S.days[k].skipped=S.days[k].skipped.filter(x=>x!==m);
  S.days[k].food=list;
  applyFoodTotals(k); save();
  return S.days[k].food;
}
/* ---------- when you ate, and meals you skipped ----------
   Logging time is not eating time: lunch logged at four is still lunch at one.
   Food-diary research has always asked for the time eaten for that reason, and
   anything the app says about timing depends on it. The American Heart
   Association's statement on meal timing (St-Onge and colleagues, 2017) notes
   irregular eating patterns appear less favourable for cardiometabolic health,
   and a randomised trial found regular meal times lowered glucose responses and
   hunger (Alhussain and colleagues, 2016). Most of that evidence is
   observational, so the app records and reflects rather than rules. */
function mealAtMs(k,m){
  const t=((S.days[k]||{}).mealAt||{})[m];
  if(t){ const mm=hhmmToMin(t); if(mm!==null) return dateOf(k).getTime()+mm*60000; }
  /* No time set: store the same time the screen shows. It used to stamp the
     clock, so breakfast logged in the evening said 07:30 but was saved at
     19:45, which also skewed "last food before bed". */
  const shown=hhmmToMin(mealAtValue(k,m));
  return shown!==null? dateOf(k).getTime()+shown*60000 : Date.now();
}
function mealAtValue(k,m){
  const r=S.days[k]||{}, t=(r.mealAt||{})[m];
  if(t) return t;
  const first=(r.food||[]).filter(x=>(x.meal||'s')===m&&x.at).sort((a,b)=>a.at-b.at)[0];
  const fmt=mins=>String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(Math.floor((mins%60)/5)*5).padStart(2,'0');
  if(first){ const d=new Date(first.at); return fmt(d.getHours()*60+d.getMinutes()); }
  /* Nothing logged yet: an empty dinner at 10:40 in the morning used to say
     "eaten at 10:40". A main meal now defaults to its planned time, unless it
     is within two hours of that time now; snacks default to now. */
  const now=new Date(), nowMin=now.getHours()*60+now.getMinutes();
  if(m!=='s'){
    let planned=null;
    try{ const sl=mealSlots(k).slots.find(x=>slotLetter(x)===m); if(sl) planned=sl.min; }catch(e){}
    if(planned!==null&&(k!==todayKey()||Math.min(Math.abs(nowMin-planned),1440-Math.abs(nowMin-planned))>120)) return fmt(planned);
  }
  return fmt(nowMin);
}
function setMealAt(k,m,hhmm){
  if(hhmmToMin(hhmm)===null) return false;
  S.days[k]=S.days[k]||{}; S.days[k].mealAt=Object.assign({},S.days[k].mealAt,{[m]:hhmm});
  /* a main meal is eaten at one time, so the whole meal moves; snacks keep
     their own times and the new time applies to the next one added */
  if(m!=='s') (S.days[k].food||[]).forEach(x=>{ if((x.meal||'s')===m) x.at=mealAtMs(k,m); });
  save(); return true;
}
function skipMeal(k,m,on){
  S.days[k]=S.days[k]||{};
  const cur=(S.days[k].skipped||[]).filter(x=>x!==m);
  S.days[k].skipped= on? cur.concat([m]) : cur;
  save();
}
/* Set how many of one food are in one meal. Zero takes it off. */
function setFoodQty(id,meal,q){
  const k=todayKey(), list=dayFood(k);
  const i=list.findIndex(x=>x.id===id&&(x.meal||'s')===meal);
  if(i<0) return null;
  if(q<=0) list.splice(i,1); else list[i].q=+(+q).toFixed(2);
  applyFoodTotals(k); save();
  return list[i]||null;
}
/* Days logged before this change can hold the same food twice in one meal.
   They are folded together the first time the day is opened. */
function mergeDayFood(k){
  const r=S.days[k]; if(!r||!Array.isArray(r.food)) return 0;
  const out=[], seen={};
  r.food.forEach(x=>{
    const key=x.id+'|'+(x.meal||'s');
    if(x.id&&String(x.id).indexOf('quick:')!==0&&seen[key]){
      seen[key].q=+(seen[key].q+(+x.q||1)).toFixed(2);
      if(x.at&&(!seen[key].at||x.at<seen[key].at)) seen[key].at=x.at;
    } else { const c=Object.assign({},x); out.push(c); seen[key]=c; }
  });
  const merged=r.food.length-out.length;
  if(merged){ r.food=out; save(); }
  return merged;
}
/* Just the numbers, for the restaurant meal or the thing off a label with no
   time to add it properly. Each one is its own entry. */
function quickAddFood(kcal,protein,meal){
  const k=todayKey(), kc=Math.max(0,Math.round(+kcal||0)), pr=Math.max(0,+(+protein||0).toFixed(1));
  if(!kc) return null;
  S.days[k]=S.days[k]||{};
  S.days[k].food=(S.days[k].food||[]).concat([{id:'quick:'+Date.now(),n:'Quick add',u:'entry',q:1,
    meal:meal||foodSlot||'s',kcal:kc,p:pr,c:0,f:0,at:Date.now(),quick:true}]);
  applyFoodTotals(k); save();
  return S.days[k].food;
}
function removeFood(i){
  const k=todayKey(); if(!S.days[k]||!S.days[k].food) return;
  S.days[k].food.splice(i,1); applyFoodTotals(k); save();
}
function applyFoodTotals(k){
  const t=foodTotals(k);
  if(!dayFood(k).length) return;
  S.days[k].kcal=Math.round(t.kcal); S.days[k].protein=Math.round(t.protein);
  S.days[k].carbs=Math.round(t.carbs); S.days[k].fat=Math.round(t.fat);
  /* fibre follows the food log once anything logged has a fibre figure */
  const fi=fibreInfo(k); if(fi.n>fi.unknown) S.days[k].fibre=Math.round(t.fibre);
  if(typeof dayDraft!=='undefined'&&dayDraft&&k===todayKey()){
    dayDraft.kcal=S.days[k].kcal; dayDraft.protein=S.days[k].protein;
    dayDraft.carbs=S.days[k].carbs; dayDraft.fat=S.days[k].fat;
    if(S.days[k].fibre!==undefined) dayDraft.fibre=S.days[k].fibre;
  }
}
function recentFoods(){
  const seen=[], out=[];
  Object.keys(S.days).sort().reverse().forEach(k=>{
    (S.days[k].food||[]).slice().reverse().forEach(x=>{ if(!seen.includes(x.id)&&out.length<6){ seen.push(x.id); out.push(x.id); } });
  });
  return out;
}
/* Which meal you are adding to. Defaults to whatever the clock suggests, so
   most of the time it is already right. */
function slotNow(){
  const h=new Date().getHours();
  return h<11? 'b' : (h<15? 'l' : (h<21? 'd' : 's'));
}
let foodQuery='', foodCameFromLog=false, foodSlot=slotNow(), foodAdding=false;
function openFood(fromLog){
  foodQuery=''; foodCat=''; foodSlot=slotNow(); foodAdding=false; foodQuick=false;
  foodCameFromLog=!!fromLog || document.getElementById('dayCheck').classList.contains('on');
  closeSheets(); drawFood(); openSheet('foodSheet');
}
function closeFood(){
  closeSheets();
  if(foodCameFromLog&&typeof openDay==='function'){ openDay(); }
  foodCameFromLog=false;
}
/* The list is redrawn on its own. The whole sheet used to be rebuilt on every
   keystroke and the search box put back with setSelectionRange, which is laggy
   on a mid-range phone and fights a non-Latin keyboard. */
/* With 138 foods a plain list is a scroll, so there are categories to browse
   and search across everything. Search always wins over a category. */
let foodCat='';
function foodListHTML(){
  const q=foodQuery.trim().toLowerCase();
  const recents=recentFoods();
  const pool=allFoods();
  const mine=pool.filter(f=>f.mine);
  let list;
  if(q) list=pool.filter(f=>f.n.toLowerCase().includes(q)).slice(0,60);
  else if(foodCat==='mine') list=mine;
  else if(foodCat) list=pool.filter(f=>f.cat===foodCat);
  else {
    /* nothing chosen: what they reach for, then the common ones */
    const first=recents.map(foodOf).filter(Boolean);
    const common=FOOD_COMMON.map(foodOf).filter(f=>f&&first.indexOf(f)<0);
    list=first.concat(common, mine.filter(f=>first.indexOf(f)<0)).slice(0,24);
  }
  if(!list.length) return `<div class="note">Nothing matching.</div>
    <button class="logrow" id="foodNew"><div class="txt"><div class="t">Add "${foodQuery.trim()}" yourself</div>
      <div class="s">Once, and it is in your list from now on</div></div></button>`;
  const onPlate=id=>dayFood(todayKey()).find(x=>x.id===id&&(x.meal||'s')===foodSlot);
  return list.map(f=>{ const p=onPlate(f.id);
    return `<div class="frow ${p?'onplate':''}">
      <div class="txt"><div class="t">${escHabit(f.n)}${f.mine?' <span class="cichip">yours</span>':''}</div>
        <div class="s">${escHabit(f.u)}${isTeen()? '' : ' · '+f.kcal+' kcal · '+f.p+'g protein'}${f.mine?' · from your label':''}${f.alc&&!isTeen()?' · '+f.alc+'g alcohol':''}</div></div>
      ${p? foodStepper(p) : `<button class="fadd half" data-foodadd="${f.id}:0.5" aria-label="Add half a portion of ${escHabit(f.n)}">½</button>
      <button class="fadd" data-foodadd="${f.id}:1" aria-label="Add ${escHabit(f.n)}">+</button>`}</div>`; }).join('')
    +`<button class="logrow" id="foodNew"><div class="txt"><div class="t">Something not on the list</div>
      <div class="s">Add it once and it stays in your list</div></div></button>`;
}
function drawFoodList(){ const el=$('foodList'); if(el) el.innerHTML=foodListHTML(); }
/* minus, the count, plus: big enough for a thumb */
/* Where a food's figures come from, in the fewest words. (Review P1-09.) */
function foodSource(x){
  if(x.quick) return 'numbers you typed';
  const f=foodOf(x.id);
  if(f&&f.mine) return 'from your label';
  return 'typical values';
}
const qtyText=q=>q===0.5?'½':(Math.round(q*2)%2? Math.floor(q)+'½' : String(Math.round(q)));
function foodStepper(x){
  const key=escHabit(x.id)+'|'+(x.meal||'s');
  return `<div class="fstep" role="group" aria-label="${escHabit(x.n)}: ${qtyText(x.q)}">
    <button data-foodstep="${key}|-1" aria-label="One less">&minus;</button>
    <span class="fq">${qtyText(x.q)}</span>
    <button data-foodstep="${key}|1" aria-label="One more">+</button></div>`;
}
/* ---------- the food screen ----------
   Rebuilt around the one thing done most: finding a food and adding it.
   The old screen listed everything already eaten first and put the search box
   at the bottom, so every add meant scrolling past the day. Now, top to bottom:
     the meal, as tabs, each with its calories so far
     search, straight away, with the keyboard kept out of its way
     this meal's plate: what is on it, each with a counter
     shortcuts: same as yesterday, your saved meals, quick add numbers
     browse by category
   Every result shows its calories and protein, adds in one tap, and turns into
   a counter once it is on the plate, so "another egg" is one tap, not a new
   row. */
let foodQuick=false;
function drawFood(){
  const k=todayKey();
  mergeDayFood(k);
  const logged=dayFood(k), t=foodTotals(k), tg=S.targets||{};
  const inMeal=m=>logged.filter(x=>(x.meal||'s')===m);
  const mealKcal=m=>Math.round(inMeal(m).reduce((a,x)=>a+x.kcal*x.q,0));
  const plate=inMeal(foodSlot);
  const mealLabel=MEALS.find(m=>m[0]===foodSlot)[1];
  const left=tg.kcal? tg.kcal-Math.round(t.kcal) : null;
  const yTotal=dayFood(addDays(k,-1)).length;
  $('foodBody').innerHTML=`
    ${isTeen()? `<div class="fhead"><div><b>${logged.length}</b> ${logged.length===1?'thing':'things'} logged today</div><div>regular meals, plenty of variety</div></div>` : `<div class="fhead">
      <div><b>${left===null? num(Math.round(t.kcal)) : num(Math.abs(left))}</b> kcal ${left===null? 'today' : (left>=0? 'left' : 'over')}</div>
      <div><b>${Math.round(t.protein)}</b>${tg.protein? '/'+tg.protein:''}g protein</div>
      <div><button class="fibtn" id="fibreWhy" aria-label="Fibre today, and why it matters"><b>${Math.round(t.fibre)}</b>${tg.fibre? '/'+tg.fibre:''}g fibre</button></div>
    </div>`}
    ${tg.kcal? `<div class="bar" style="margin-bottom:12px"><i style="width:${Math.min(100,Math.round(t.kcal/tg.kcal*100))}%;background:${left<0?'var(--oxblood)':'var(--forest-bg)'}"></i></div>`:''}
    <div class="mealtabs" role="tablist" aria-label="Which meal">${MEALS.map(([id,label])=>`<button role="tab" aria-selected="${foodSlot===id}"
      class="${foodSlot===id?'on':''}" data-foodslot="${id}"><span>${label}</span><small>${isTeen()? (inMeal(id).length? inMeal(id).length+' logged':'–') : (mealKcal(id)? mealKcal(id)+' kcal' : '–')}</small></button>`).join('')}</div>

    <div class="foodsearch"><input id="foodSearch" type="search" enterkeyhint="search" autocomplete="off"
      placeholder="Search food to add to ${mealLabel.toLowerCase()}" value="${escHabit(foodQuery)}" aria-label="Search food"></div>

    ${foodQuery.trim()? '' : `
    <div class="plate">
      <div class="platehead"><b>${mealLabel}</b>
        <label class="ateat">${foodSlot==='s'? 'Next one eaten at' : 'Eaten at'} <input type="time" id="mealAt" value="${mealAtValue(k,foodSlot)}" aria-label="${mealLabel} eaten at"></label></div>
      <div class="platesub"><span>${plate.length? (isTeen()? plate.length+' logged' : mealKcal(foodSlot)+' kcal · '+Math.round(plate.reduce((a,x)=>a+x.p*x.q,0))+'g protein') : 'nothing yet'}</span>
        ${!plate.length&&foodSlot!=='s'? (((S.days[k]||{}).skipped||[]).indexOf(foodSlot)>=0
          ? `<span class="skipnote">Skipped <button class="inlinebtn" data-unskip="${foodSlot}">Undo</button></span>`
          : `<button class="inlinebtn" data-skipmeal="${foodSlot}">I skipped ${mealLabel.toLowerCase()}</button>`) : ''}</div>
      ${plate.map(x=>`<div class="frow onplate">
        <div class="txt"><div class="t">${escHabit(x.n)}</div>
          <div class="s">${x.quick? 'your numbers' : escHabit(x.u)}${isTeen()? '' : ' · '+Math.round(x.kcal*x.q)+' kcal · '+Math.round(x.p*x.q)+'g protein'} · <span class="src">${foodSource(x)}</span></div></div>
        ${x.quick? `<button class="fadd rm" data-foodstep="${escHabit(x.id)}|${x.meal||'s'}|-99" aria-label="Remove">&minus;</button>` : foodStepper(x)}</div>`).join('')}
      <div class="shortcuts">
        ${yTotal?`<button class="mini" id="foodYesterday">Same as yesterday</button>`:''}
        ${savedMeals().map(m=>`<button class="mini" data-savedmeal="${m.id}">${escHabit(m.name)}</button>`).join('')}
        ${plate.length?`<button class="mini" id="foodSaveMeal">Save this ${mealLabel.toLowerCase()}</button>`:''}
        ${isTeen()? '' : `<button class="mini" id="foodQuickBtn">Quick add numbers</button>`}
      </div>
      ${foodQuick? `<div class="quickadd">
        <div class="nf"><label>Calories</label><input id="qaKcal" type="number" inputmode="numeric" placeholder="650"></div>
        <div class="nf"><label>Protein g</label><input id="qaP" type="number" inputmode="decimal" placeholder="30"></div>
        <button class="mini go" id="qaSave">Add</button></div>` : ''}
    </div>
    <div class="pickchips" id="foodCats">
      <button class="${foodCat?'':'on'}" data-foodcat="">Common</button>
      ${FOOD_CATS.filter(c=>c[0]!=='common').map(([id,label])=>`<button class="${foodCat===id?'on':''}" data-foodcat="${id}">${label}</button>`).join('')}
      ${allFoods().some(f=>f.mine)? `<button class="${foodCat==='mine'?'on':''}" data-foodcat="mine">Yours</button>`:''}
    </div>`}
    <div id="foodList">${foodListHTML()}</div>
    <div class="fdone"><button class="sheetcta" id="foodDone">${foodCameFromLog?'Back to the log':'Done'}</button></div>`;
}
/* Adding a food you have not got in the list, without leaving the sheet. */
/* Fibre today: what counted, what did not, where it came from, and why 30g */
function fibreSheetHtml(k){
  const fi=fibreInfo(k), tg=(S.targets||{}).fibre||30, items=dayFood(k);
  const top=items.map(x=>({n:x.n,g:(fibreOf(x)||0)*x.q})).filter(x=>x.g>=0.5).sort((a,b)=>b.g-a.g).slice(0,4);
  const gram=Math.round(fi.g), gap=Math.max(0,tg-gram);
  return `<div style="padding:0 14px 10px">
    <div class="fhead"><div><b>${gram}</b>g fibre today</div><div>target ${tg}g</div></div>
    <div class="bar" style="margin:4px 0 12px"><i style="width:${Math.min(100,Math.round(fi.g/tg*100))}%;background:var(--forest-bg)"></i></div>
    ${top.length? `<div class="slab">Where it came from</div>${top.map(x=>`<div class="note" style="margin:2px 0"><b>${escHabit(x.n)}</b> ${Math.round(x.g*10)/10}g</div>`).join('')}` : ''}
    ${fi.unknown? `<div class="note">${fi.unknown} thing${fi.unknown===1?' has':'s have'} no fibre figure (your own numbers, or a food added before fibre was counted), so the real total is higher.</div>` : ''}
    ${fi.rough? `<div class="note">Mixed dishes, takeaways and protein bars vary with the recipe, so their fibre is a typical value.</div>` : ''}
    ${fi.n&&gap? `<div class="note">${gap}g to go. Easy ways to get there: a pear (5.5g), half a tin of beans (7.5g), a bowl of porridge (4g), peas or broccoli with dinner (3 to 5g), wholemeal bread over white (2.5g against 1g a slice).</div>` : ''}
    ${fi.n&&!gap? `<div class="note">Target met.</div>` : ''}
    <div class="slab">Why 30g</div>
    <div class="note">30g a day is the UK recommendation (SACN, 2015); Europe's food safety authority sets 25g. A review of 185 studies and 58 trials found people eating 25 to 29g a day had 15 to 30% lower rates of death, heart disease, stroke, type 2 diabetes and bowel cancer than those eating least (Reynolds and colleagues, Lancet, 2019). Most of that evidence is observational: a strong association, not proof. Go up gradually and drink with it, or your gut will let you know.</div>
  </div>`;
}
function openFibre(){
  document.getElementById('altTitle').textContent='Fibre';
  document.getElementById('altSub').textContent='Counted from what you logged.';
  document.getElementById('altBody').innerHTML=fibreSheetHtml(todayKey());
  openSheet('altSheet');
}
document.addEventListener('click',e=>{ if(e.target.closest('#fibreWhy')) openFibre(); });
function drawFoodNew(){
  foodAdding=true;
  $('foodBody').innerHTML=`
    <div class="slab">Something of your own</div>
    <div class="nf" style="margin-bottom:10px"><label>What is it</label>
      <input id="nfName" value="${(foodQuery||'').replace(/"/g,'&quot;')}" placeholder="Mam's brown bread" style="font-family:Archivo;font-size:15px;font-weight:600"></div>
    <div class="nf" style="margin-bottom:10px"><label>One portion is</label>
      <input id="nfUnit" placeholder="slice, bowl, 100g" style="font-family:Archivo;font-size:15px;font-weight:600"></div>
    <div class="twoup" style="gap:10px;margin-bottom:10px">
      <div class="nf"><label>Calories</label><input id="nfKcal" type="number" inputmode="numeric" placeholder="180"></div>
      <div class="nf"><label>Protein g</label><input id="nfP" type="number" inputmode="decimal" placeholder="6"></div></div>
    <div class="twoup" style="gap:10px">
      <div class="nf"><label>Carbs g</label><input id="nfC" type="number" inputmode="decimal" placeholder="30"></div>
      <div class="nf"><label>Fat g</label><input id="nfF" type="number" inputmode="decimal" placeholder="2"></div></div>
    <div class="twoup" style="gap:10px;margin-top:10px">
      <div class="nf"><label>Fibre g</label><input id="nfFb" type="number" inputmode="decimal" placeholder="3"></div><div></div></div>
    <div class="note">Off the packet is fine. Carbs, fat and fibre can be left blank if you only care about protein.</div>
    <button class="sheetcta" id="nfSave">Save it and add it</button>
    <button class="skipbtn" id="nfCancel">Back to the list</button>`;
}
document.addEventListener('click',e=>{
  if(e.target.closest('#foodBtn')) openFood(true);
  if(e.target.closest('#foodDone')) closeFood();
  const fc=e.target.closest('[data-foodcat]');
  if(fc){ foodCat=fc.dataset.foodcat; foodQuery=''; drawFood(); return; }
  const fs=e.target.closest('[data-foodslot]');
  if(fs){ foodSlot=fs.dataset.foodslot; drawFood(); }
  if(e.target.closest('#foodYesterday')){
    const n=repeatYesterday();
    drawFood(); renderAll();
    toast(n? n+' things copied from yesterday' : 'Nothing logged yesterday'); }
  if(e.target.closest('#foodSaveMeal')){
    const label=MEALS.find(m=>m[0]===foodSlot)[1];
    const m=saveMealAs(label+' '+prettyDate(todayKey()),foodSlot);
    drawFood(); toast(m? 'Saved as "'+m.name+'"' : 'Nothing in that meal yet'); }
  const sm=e.target.closest('[data-savedmeal]');
  if(sm){ const n=addSavedMeal(sm.dataset.savedmeal); drawFood(); renderAll();
    toast(n+' things added'); }
  if(e.target.closest('#foodNew')){ drawFoodNew(); }
  if(e.target.closest('#nfCancel')){ foodAdding=false; drawFood(); }
  if(e.target.closest('#nfSave')){
    const v=id=>{ const el=document.getElementById(id); return el? el.value.trim() : ''; };
    const name=v('nfName'), kcal=+v('nfKcal');
    if(!name||!kcal){ toast('It needs a name and a calorie figure'); return; }
    const f=addCustomFood({id:'cf'+Date.now(),n:name,u:v('nfUnit')||'portion',mine:true,
      kcal:kcal,p:+v('nfP')||0,c:+v('nfC')||0,f:+v('nfF')||0});
    if(v('nfFb')!==''&&!Number.isNaN(+v('nfFb'))&&+v('nfFb')>=0) f.fb=+v('nfFb');
    foodAdding=false; foodQuery=''; addFood(f.id,1); drawFood(); renderAll();
    toast(f.n+' saved and added'); }
  const fa=e.target.closest('[data-foodadd]');
  if(fa){ const [id,q]=fa.dataset.foodadd.split(':'); addFood(id,+q);
    drawFood(); if(typeof drawDay==='function'&&document.getElementById('dayCheck').classList.contains('on')) drawDay(); }
  const fst=e.target.closest('[data-foodstep]');
  if(fst){
    const parts=fst.dataset.foodstep.split('|'), d=+parts.pop(), meal=parts.pop(), id=parts.join('|');
    const cur=dayFood(todayKey()).find(x=>x.id===id&&(x.meal||'s')===meal); if(!cur) return;
    const before=JSON.parse(JSON.stringify(cur));
    const next= d<-1? 0 : (cur.q<1&&d>0? 1 : (cur.q<=1&&d<0? 0 : cur.q+d));
    setFoodQty(id,meal,next);
    drawFood(); renderAll();
    if(next<=0) toast(before.n+' taken off','Undo',()=>{
      const k=todayKey(); S.days[k]=S.days[k]||{}; S.days[k].food=(S.days[k].food||[]).concat([before]);
      applyFoodTotals(k); save(); drawFood(); renderAll(); });
    return; }
  const sk=e.target.closest('[data-skipmeal]');
  if(sk){ skipMeal(todayKey(),sk.dataset.skipmeal,true); drawFood(); renderAll();
    toast(isTeen()? 'Noted. While you are growing, regular meals really help, so try not to make it a habit.' : 'Noted as skipped'); return; }
  const us=e.target.closest('[data-unskip]');
  if(us){ skipMeal(todayKey(),us.dataset.unskip,false); drawFood(); renderAll(); return; }
  if(e.target.closest('#foodQuickBtn')){ foodQuick=!foodQuick; drawFood();
    if(foodQuick){ const el=document.getElementById('qaKcal'); if(el) el.focus(); } return; }
  if(e.target.closest('#qaSave')){
    const kc=+document.getElementById('qaKcal').value, pr=+document.getElementById('qaP').value;
    if(!kc){ toast('Put the calories in first'); return; }
    quickAddFood(kc,pr,foodSlot); foodQuick=false; drawFood(); renderAll();
    toast(kc+' kcal added to '+MEALS.find(m=>m[0]===foodSlot)[1].toLowerCase()); return; }
  const fr=e.target.closest('[data-foodrm]');
  if(fr){ const i=+fr.dataset.foodrm, gone=dayFood(todayKey())[i];
    removeFood(i); drawFood();
    if(gone) toast(gone.n+' removed','Undo',()=>{
      const k=todayKey(); S.days[k]=S.days[k]||{};
      const list=(S.days[k].food||[]).slice(); list.splice(i,0,gone); S.days[k].food=list;
      applyFoodTotals(k); save(); drawFood(); renderAll(); }); }
});
document.addEventListener('input',e=>{
  if(e.target.id==='targetValue'){ const el=document.getElementById('targetKcal');
    if(el){ const sp=el.querySelector('span'); if(sp) sp.textContent=targetKcalPreview(); } }
  /* Only the results redraw, so the input keeps its focus, its cursor and its
     composition state on its own. */
  if(e.target.id==='foodSearch'){ foodQuery=e.target.value; drawFoodList(); }
});

