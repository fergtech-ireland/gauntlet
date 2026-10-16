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
const FOOD_CATS=[['common','Common foods'],['breakfast','Breakfast'],['meat','Meat'],['fish','Fish and seafood'],
  ['carbs','Bread, potatoes and grains'],['veg','Fruit and vegetables'],['pulses','Beans, nuts and seeds'],['dairy','Dairy and eggs'],
  ['meals','Meals and takeaway'],['snacks','Snacks and sweets'],['drinks','Drinks'],['sauces','Sauces, oils and spices']];
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
  {id:'mackerel',n:'Mackerel, smoked',u:'100g',kcal:310,p:19,c:0,f:26,cat:'fish'},
  {id:'salmon',n:'Salmon fillet, cooked',u:'130g',kcal:280,p:33,c:0,f:16,cat:'fish'},
  {id:'smokedsalmon',n:'Smoked salmon',u:'50g',kcal:90,p:12,c:0,f:4.5,cat:'fish'},
  {id:'cod',n:'Cod or hake, cooked',u:'150g',kcal:145,p:32,c:0,f:1.5,cat:'fish'},
  {id:'tuna',n:'Tuna, tinned in water',u:'tin, 110g',kcal:120,p:27,c:0,f:1,cat:'fish'},
  {id:'sardines',n:'Sardines, tinned',u:'tin',kcal:180,p:21,c:0,f:11,cat:'fish'},
  {id:'prawns',n:'Prawns, cooked',u:'100g',kcal:100,p:22,c:0,f:1,cat:'fish'},
  {id:'fishfingers',n:'Fish fingers, 4',u:'4',kcal:220,p:13,c:19,f:10,cat:'fish'},

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
  {id:'salmon_raw',n:'Salmon fillet, raw',u:'100g',kcal:180,p:20,c:0,f:11,cat:'fish'},
  {id:'cod_raw',n:'Cod or hake, raw',u:'100g',kcal:80,p:18,c:0,f:0.7,cat:'fish'},
  {id:'prawns_raw',n:'Prawns, raw',u:'100g',kcal:75,p:17,c:0,f:0.6,cat:'fish'},
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
/* ---------- what each portion weighs (build 73) ----------
   So every food can be logged to the gram, or the millilitre for drinks, the
   portions above are given a weight. Single foods use the household weights
   in the same tables (a large egg 50g, a slice of wholemeal 40g, a pint 568ml);
   plates, takeaways and rolls are typical servings, a rule of thumb, and the
   label or a kitchen scale beats them. Drinks, milk, cream, gravy and thin
   sauces are in ml. */
const PORTION_G={egg:50,eggwhite:100,oats:50,porridge_milk:300,weetabix:37.5,cornflakes:40,granola:50,muesli:50,fullirish:450,
  rasher:25,sausage:45,blackpud:40,whitepud:40,beans:207,pancakes:120,croissant:60,
  chicken:150,chickenthigh:100,chickenfillet_bd:140,turkey:100,mince5:150,mince20:150,steak:200,porkchop:150,lamb:150,ham:50,
  bacon_med:50,mackerel:100,salmon:130,smokedsalmon:50,cod:150,tuna:110,sardines:90,prawns:100,fishfingers:112,
  chicken_raw:100,chickenthigh_raw:100,turkey_raw:100,mince5_raw:100,mince20_raw:100,steak_raw:100,pork_raw:100,lamb_raw:100,
  salmon_raw:100,cod_raw:100,prawns_raw:100,mince_turkey_raw:100,
  brownbread:50,wholemeal:40,whitebread:38,sourdough:50,bagel:95,wrap:62,pitta:60,roll:75,potato:200,mash:200,roastspuds:150,
  chips_oven:150,chips_bag:300,sweetpot:200,rice:180,ricebrown:180,pasta:200,noodles:200,couscous:150,quinoa:150,
  banana:120,apple:150,orange:130,berries:100,grapes:100,pear:170,avocado:100,broccoli:100,carrots:100,cabbage:100,peas:100,
  saladmix:75,tomato:100,mushrooms:100,onion:100,veg_mixed:150,beetroot:100,
  skyr:150,greekyog:150,yoghurt_fruit:125,milk:200,milk_whole:200,cheddar:30,lowfatcheese:30,cottage:100,mozzarella:50,butter:10,
  cream:30,whey:30,
  chickencurry:550,stew:400,baconcabbage:500,chowder:350,shepherds:400,lasagne:400,spagbol:500,stirfry:450,chickensalad:350,
  sandwich_chicken:200,sandwich_ham:180,toastie:200,soup:300,chickenroll:300,breakfastroll:320,pizza:280,burger_meal:450,
  fishchips:550,chinese_curry:650,kebab:400,sushi:280,omelette:200,protein_bowl:450,
  crisps:35,peanuts:30,almonds:30,peanutbutter:16,proteinbar:60,choc_bar:45,biscuits:30,scone:100,flapjack:75,muffin:110,
  icecream:100,popcorn:25,ricecakes:18,hummus:50,olives:50,darkchoc:25,
  tea:250,coffee_black:250,latte:350,cappuccino:300,oj:200,smoothie:250,proteinshake:400,cola:330,diet_drink:330,
  sportsdrink:500,pint_stout:568,pint_lager:568,wine:175,spirit:35.5,water:250,
  ketchup:15,mayo:15,mayo_light:15,brownsauce:15,mustard:5,bbqsauce:17,sweetchilli:15,soysauce:15,hotsauce:5,garlicsauce:15,
  taco_sauce:15,saladcream:15,caesar:15,vinaigrette:15,pesto:15,gravy:50,currysauce:100,tartare:15,sourcream:15,oliveoil:14,
  honey:7,jam:7,chocspread:15,salsa:15};
const PORTION_ML=new Set(['milk','milk_whole','cream','tea','coffee_black','latte','cappuccino','oj','smoothie','proteinshake','cola',
  'diet_drink','sportsdrink','pint_stout','pint_lager','wine','spirit','water','gravy','currysauce','soysauce','vinaigrette']);
FOODS.forEach(f=>{ if(PORTION_G[f.id]){ f.g=PORTION_G[f.id]; f.m=PORTION_ML.has(f.id)? 'ml' : 'g'; } });
/* ---------- the verified list (build 73) ----------
   Everything above is the short everyday list, Irish staples included. Behind
   it sit the 2,800 foods in foods-db.js, from the USDA's laboratory analysed
   Standard Reference (SR Legacy), each per 100g or 100ml, with the household
   weights USDA measured. They come up in search and in the categories, and
   say where they are from. */
const FOODS_DB=(typeof FOODS_DB_ROWS!=='undefined'? FOODS_DB_ROWS : []).map(r=>{
  const f={id:r[0],n:r[1],cat:r[2],kcal:r[3],p:r[4],c:r[5],f:r[6],fb:r[7],m:r[8],g:100,u:'100'+r[8],src:'usda'};
  if(r[9]&&r[9].length) f.por=r[9];
  if(r[10]) f.alc=r[10];
  return f;
});
const FOOD_IDX=new Map();
FOODS.concat(FOODS_DB).forEach(f=>FOOD_IDX.set(f.id,f));
/* The handful almost everyone taps, shown first before anything is logged. */
const FOOD_COMMON=['egg','oats','chicken','rice','potato','brownbread','skyr','banana','milk','tea','whey','apple'];
/* Your own things, saved as you go. The built in list is deliberately short,
   which only works if anything missing from it can be added once and reused. */
const MEALS=[['b','Breakfast'],['l','Lunch'],['d','Dinner'],['s','Snacks']];
const customFoods=()=>Array.isArray(S.customFoods)? S.customFoods : [];
const savedMeals=()=>Array.isArray(S.savedMeals)? S.savedMeals : [];
/* ---------- packaged food you scanned (build 76) ----------
   Kept on the phone, keyed by barcode, so a second scan is instant and works
   offline. Each one is per 100g or 100ml, the way EU labels give it, with the
   label's serving as a unit when the label has one (por, grams per one).
   src 'off' came from Open Food Facts; 'label' was typed from the packet,
   either because Open Food Facts did not have it or had it with gaps.
   scan.js does the scanning, the lookup and the from-the-label screen. */
const scannedMap=()=>(S.scanned&&typeof S.scanned==='object'&&!Array.isArray(S.scanned))? S.scanned : {};
const scannedFoods=()=>Object.keys(scannedMap()).map(k=>scannedMap()[k]).filter(f=>f&&f.id);
const isScanned=f=>!!(f&&f.code&&(f.src==='off'||f.src==='label'));
/* the label's serving, as the unit the food screen shows: {label, g} */
const scanServing=f=>(isScanned(f)&&f.por&&f.por[0]&&+f.por[0][1]>0)? {label:String(f.por[0][0]).replace(/^1 /,''), g:+f.por[0][1]} : null;
const allFoods=()=>FOODS.concat(FOODS_DB,customFoods(),scannedFoods());
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
const foodOf=id=>FOOD_IDX.get(id)||customFoods().find(f=>f.id===id)||(/^bc\d+$/.test(String(id))? scannedMap()[String(id).slice(2)]||null : null);
/* Which day the food sheet is adding to (build 57). Null means today, which is
   every way in except the Eat tab's date switcher: going back a day there and
   adding opens the sheet on that day, so a forgotten snack lands where it was
   eaten. Closing any sheet puts it back to today, so nothing added from
   anywhere else can land on an old day. Never a future day. */
let foodDay=null;
const foodKey=()=>(foodDay&&foodDay<todayKey())? foodDay : todayKey();
function addCustomFood(f){
  S.customFoods=customFoods().concat([f]); save(); return f;
}
function saveMealAs(name,slot){
  const items=dayFood(foodKey()).filter(x=>(x.meal||'s')===slot);
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
  const y=dayFood(addDays(foodKey(),-1));
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
  const k=foodKey(), m=meal||foodSlot||'s', n=+q||1;
  S.days[k]=S.days[k]||{};
  const list=(S.days[k].food||[]).slice();
  const same=list.find(x=>x.id===f.id&&(x.meal||'s')===m);
  if(same){ same.q=+(same.q+n).toFixed(4); if(f.g&&!same.g){ same.g=f.g; same.m=f.m||'g'; } }
  else { const row={id:f.id,n:f.n,u:f.u,q:+n.toFixed(4),meal:m,kcal:f.kcal,p:f.p,c:f.c,f:f.f,at:mealAtMs(k,m)};
    if(typeof f.fb==='number') row.fb=f.fb;
    /* build 73: the portion's weight travels with the row, so "150g" can be
       shown and changed even if the list is ever updated */
    if(f.g){ row.g=f.g; row.m=f.m||'g'; }
    if(f.src) row.src=f.src;
    if(f.alc) row.alc=f.alc;
    list.push(row); }
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
  const k=foodKey(), list=dayFood(k);
  const i=list.findIndex(x=>x.id===id&&(x.meal||'s')===meal);
  if(i<0) return null;
  if(q<=0) list.splice(i,1); else list[i].q=+(+q).toFixed(4);
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
      seen[key].q=+(seen[key].q+(+x.q||1)).toFixed(4);
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
  const k=foodKey(), kc=Math.max(0,Math.round(+kcal||0)), pr=Math.max(0,+(+protein||0).toFixed(1));
  if(!kc) return null;
  const m=meal||foodSlot||'s';
  S.days[k]=S.days[k]||{};
  S.days[k].food=(S.days[k].food||[]).concat([{id:'quick:'+Date.now(),n:'Quick add',u:'entry',q:1,
    meal:m,kcal:kc,p:pr,c:0,f:0,at:k===todayKey()? Date.now() : mealAtMs(k,m),quick:true}]);
  applyFoodTotals(k); save();
  return S.days[k].food;
}
function removeFood(i){
  const k=foodKey(); if(!S.days[k]||!S.days[k].food) return;
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
/* opts (build 57, from the Eat tab): day, a past day to add to; slot, the
   meal to open on; search, put the cursor in the search box. */
function openFood(fromLog,opts){
  opts=opts||{};
  foodQuery=''; foodCat=''; foodMore=false; foodAmt=null; foodSlot=opts.slot||slotNow(); foodAdding=false; foodQuick=false;
  foodCameFromLog=!!fromLog || document.getElementById('dayCheck').classList.contains('on');
  closeSheets();
  foodDay=(opts.day&&opts.day<todayKey())? opts.day : null;
  const h=document.querySelector('#foodSheet h3');
  if(h) h.textContent=foodDay? 'Food, '+dateOf(foodDay).toLocaleDateString('en-IE',{weekday:'long',day:'numeric',month:'long'}) : 'Food today';
  drawFood(); openSheet('foodSheet');
  if(opts.search) setTimeout(()=>{ const el=document.getElementById('foodSearch'); if(el) try{ el.focus({preventScroll:true}); }catch(e){} },60);
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
let foodCat='', foodMore=false;
/* ---------- finding a food among 2,900 (build 73) ----------
   Every word typed must appear (a trailing s is forgiven, so "eggs" finds
   "Egg"). Then: your recent foods first, your own foods, the everyday list,
   then the USDA list; a match at the start of the name or of a word beats one
   in the middle, and shorter, plainer names beat long ones. */
function findFoods(q){
  const toks=String(q||'').toLowerCase().split(/[\s,]+/).filter(Boolean);
  if(!toks.length) return [];
  const rec=recentFoods(), out=[];
  allFoods().forEach(f=>{
    const n=f.n.toLowerCase(); let sc=0;
    for(const t0 of toks){
      let t=t0, i=n.indexOf(t);
      if(i<0&&t.length>3&&/s$/.test(t)){ t=t.slice(0,-1); i=n.indexOf(t); }
      if(i<0) return;
      sc+= i===0? 40 : (/[\s,(\-\/]/.test(n[i-1])? 20 : 0);
    }
    if(f.mine) sc+=300; else if(isScanned(f)) sc+=250; else if(f.src!=='usda') sc+=150;
    const r=rec.indexOf(f.id); if(r>=0) sc+=400-r;
    sc-= n.length/4 + (n.split(',').length-1)*6;
    out.push([sc,f]);
  });
  return out.sort((a,b)=>b[0]-a[0]).slice(0,60).map(x=>x[1]);
}
const CAT_SHOW=80;
function foodListHTML(){
  const q=foodQuery.trim().toLowerCase();
  const recents=recentFoods();
  const pool=allFoods();
  const mine=pool.filter(f=>f.mine);
  let list, more=0;
  /* build 76: scanned products, newest first */
  const scans=()=>scannedFoods().sort((a,b)=>(b.at||0)-(a.at||0));
  if(q) list=findFoods(q);
  else if(foodCat==='mine') list=mine;
  else if(foodCat==='scanned') list=scans();
  else if(foodCat){
    const all=pool.filter(f=>f.cat===foodCat);
    list= foodMore? all : all.slice(0,CAT_SHOW); more=all.length-list.length;
  }
  else {
    /* nothing chosen: what they reach for, then the common ones */
    const first=recents.map(foodOf).filter(Boolean);
    /* build 76: what you scanned lately sits with what you logged lately */
    scans().slice(0,4).forEach(f=>{ if(first.indexOf(f)<0) first.push(f); });
    const common=FOOD_COMMON.map(foodOf).filter(f=>f&&first.indexOf(f)<0);
    list=first.concat(common, mine.filter(f=>first.indexOf(f)<0)).slice(0,24);
  }
  if(!list.length) return `<div class="note">Nothing matching.</div>
    <button class="logrow" id="foodNew"><div class="txt"><div class="t">Add "${escHabit(foodQuery.trim())}" yourself</div>
      <div class="s">Once, and it is in your list from now on</div></div></button>`;
  const onPlate=id=>dayFood(foodKey()).find(x=>x.id===id&&(x.meal||'s')===foodSlot);
  return list.map(f=>{ const p=onPlate(f.id), w=portionG(f), u=unitOf(f), db=f.src==='usda', sc=isScanned(f), qa=quickAmt(f);
    const per= db||sc? 'per 100'+u : escHabit(f.u)+(w&&!/^\d/.test(String(f.u))? ', '+amtNum(w)+u : '');
    return `<div class="frow ${p?'onplate':''}">
      <button class="fopen" data-foodopen="${escHabit(f.id)}" aria-label="${escHabit(f.n)}. Choose how much">
        <span class="t">${escHabit(f.n)}${f.mine?' <span class="cichip">yours</span>':''}</span>
        <span class="s">${per}${isTeen()? '' : ' · '+f.kcal+' kcal · '+f.p+'g protein'}${f.mine||f.src==='label'?' · from your label':''}${db?' · USDA':''}${f.src==='off'?' · Open Food Facts':''}${f.alc&&!isTeen()?' · '+f.alc+'g alcohol':''}</span></button>
      ${p? `<button class="fhave" data-foodopen="${escHabit(f.id)}|${foodSlot}" aria-label="${escHabit(f.n)}, ${amountText(p)} in this meal. Change it">${amountText(p)}</button>`
        : `<button class="fadd" data-foodadd="${escHabit(f.id)}:${qa.q}" aria-label="Add ${escHabit(qa.label)} of ${escHabit(f.n)}">+</button>`}</div>`; }).join('')
    +(more? `<button class="mini foodmore" data-foodmore>Show all ${more+list.length} in ${escHabit((FOOD_CATS.find(c=>c[0]===foodCat)||[0,'this list'])[1].toLowerCase())}</button>` : '')
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
  if(x.src==='usda'||(f&&f.src==='usda')) return 'USDA lab values';
  /* build 76: Open Food Facts is people photographing and typing up labels,
     so it is the label's numbers, and says so; typed from the packet is yours */
  if(x.src==='off'||(f&&f.src==='off')) return 'Open Food Facts, from the label';
  if(x.src==='label'||(f&&f.src==='label')) return 'from your label';
  return 'typical values';
}
const qtyText=q=>q===0.5?'½':(Math.round(q*2)%2? Math.floor(q)+'½' : String(Math.round(q)));
/* ---------- grams and millilitres (build 73) ----------
   Feargal: after adding 100g there was no way to add 50g more, so everything
   came in 100g steps. Now every food with a known weight can be set to the
   gram (or ml): the g button on a row, or tapping the amount on the plate,
   opens a box to type it, with nudges of 1 and 10 and the usual portions as
   chips. Foods sold by weight (anything listed per 100g, 150g and so on)
   count in grams on the plate and step in half portions (50g on a 100g
   food), so 100g, then 150g, is one tap. Counted foods (an egg, a slice)
   still count 1, 2, 3, and show grams once they are not a whole or a half. */
function portionG(x){ if(x&&+x.g>0) return +x.g; const f=x&&foodOf(x.id); return f&&+f.g>0? +f.g : null; }
function unitOf(x){ if(x&&x.m) return x.m; const f=x&&foodOf(x.id); return (f&&f.m)||'g'; }
function weighed(x){
  if(!x) return false;
  const f=foodOf(x.id)||x;
  if(f.src==='usda'||x.src==='usda') return true;
  return !!portionG(x)&&/^\d+(\.\d+)?\s?(g|ml)\b/i.test(String(f.u||x.u||''));
}
const amtNum=v=>{ const r=Math.round(v*10)/10; return r>=100? String(Math.round(r)) : String(r); };
function amountText(x){
  const g=portionG(x), q=+x.q||0;
  if(g&&(weighed(x)||Math.abs(q*2-Math.round(q*2))>0.001)) return amtNum(q*g)+unitOf(x);
  return qtyText(q);
}
/* the next amount for − and +: weighed foods snap to the next half portion
   (135g, +, is 150g), counted foods go up and down by one as before */
function stepQty(cur,d,w){
  if(d<-1) return 0;
  if(w){ const h=cur*2; return Math.max(0, d>0? (Math.floor(h+1e-6)+1)/2 : (Math.ceil(h-1e-6)-1)/2); }
  return cur<1&&d>0? 1 : (cur<=1&&d<0? 0 : cur+d);
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
  if(foodAmt){ drawFoodAmount(); return; }
  const sh=$('foodSheet'); if(sh) sh.classList.remove('amtmode');
  const k=foodKey(), dayWord=k===todayKey()? 'today' : 'that day';
  mergeDayFood(k);
  const logged=dayFood(k), t=foodTotals(k), tg=S.targets||{};
  const inMeal=m=>logged.filter(x=>(x.meal||'s')===m);
  const mealKcal=m=>Math.round(inMeal(m).reduce((a,x)=>a+x.kcal*x.q,0));
  const plate=inMeal(foodSlot);
  const mealLabel=MEALS.find(m=>m[0]===foodSlot)[1];
  const left=tg.kcal? tg.kcal-Math.round(t.kcal) : null;
  const yTotal=dayFood(addDays(k,-1)).length;
  $('foodBody').innerHTML=`
    ${isTeen()? `<div class="fhead"><div><b>${logged.length}</b> ${logged.length===1?'thing':'things'} logged ${dayWord}</div><div>regular meals, plenty of variety</div></div>` : `<div class="fhead">
      <div><b>${left===null? num(Math.round(t.kcal)) : num(Math.abs(left))}</b> kcal ${left===null? dayWord : (left>=0? 'left' : 'over')}</div>
      <div><b>${Math.round(t.protein)}</b>${tg.protein? '/'+tg.protein:''}g protein</div>
      <div><button class="fibtn" id="fibreWhy" aria-label="Fibre today, and why it matters"><b>${Math.round(t.fibre)}</b>${tg.fibre? '/'+tg.fibre:''}g fibre</button></div>
    </div>`}
    ${tg.kcal? `<div class="bar" style="margin-bottom:12px"><i style="width:${Math.min(100,Math.round(t.kcal/tg.kcal*100))}%;background:${left<0?'var(--coral-text)':'var(--cta)'}"></i></div>`:''}
    <div class="mealtabs" role="tablist" aria-label="Which meal">${MEALS.map(([id,label])=>`<button role="tab" aria-selected="${foodSlot===id}"
      class="${foodSlot===id?'on':''}" data-foodslot="${id}"><span>${label}</span><small>${isTeen()? (inMeal(id).length? inMeal(id).length+' logged':'–') : (mealKcal(id)? mealKcal(id)+' kcal' : '–')}</small></button>`).join('')}</div>

    <div class="foodsearch"><input id="foodSearch" type="search" enterkeyhint="search" autocomplete="off"
      placeholder="Search food to add to ${mealLabel.toLowerCase()}" value="${escHabit(foodQuery)}" aria-label="Search food">
      ${typeof scanIcon==='function'? `<button class="scanbtn" data-scan aria-label="Scan a barcode">${scanIcon()}</button>` : ''}</div>

    ${/* build 73: always drawn, hidden by .q while searching, so clearing the box brings it back */''}${`
    <div class="plate">
      <div class="platehead"><b>${mealLabel}</b>
        <label class="ateat">${foodSlot==='s'? 'Next one eaten at' : 'Eaten at'} <input type="time" id="mealAt" value="${mealAtValue(k,foodSlot)}" aria-label="${mealLabel} eaten at"></label></div>
      <div class="platesub"><span>${plate.length? (isTeen()? plate.length+' logged' : mealKcal(foodSlot)+' kcal · '+Math.round(plate.reduce((a,x)=>a+x.p*x.q,0))+'g protein') : 'nothing yet'}</span>
        ${!plate.length&&foodSlot!=='s'? (((S.days[k]||{}).skipped||[]).indexOf(foodSlot)>=0
          ? `<span class="skipnote">Skipped <button class="inlinebtn" data-unskip="${foodSlot}">Undo</button></span>`
          : `<button class="inlinebtn" data-skipmeal="${foodSlot}">I skipped ${mealLabel.toLowerCase()}</button>`) : ''}</div>
      ${plate.map(x=>x.quick? `<div class="frow onplate">
        <div class="txt"><div class="t">${escHabit(x.n)}</div>
          <div class="s">your numbers · ${isTeen()? '' : Math.round(x.kcal*x.q)+' kcal · '+Math.round(x.p*x.q)+'g protein · '}<span class="src">${foodSource(x)}</span></div></div>
        <button class="fadd rm" data-foodstep="${escHabit(x.id)}|${x.meal||'s'}|-99" aria-label="Remove">&minus;</button></div>`
      : `<button class="frow onplate fplate" data-foodopen="${escHabit(x.id)}|${x.meal||'s'}" aria-label="${escHabit(x.n)}, ${amountText(x)}. Change or remove">
        <span class="txt"><span class="t">${escHabit(x.n)}</span>
          <span class="s">${weighed(x)? '' : escHabit(x.u)+' · '}${isTeen()? '' : Math.round(x.kcal*x.q)+' kcal · '+Math.round(x.p*x.q)+'g protein · '}<span class="src">${foodSource(x)}</span></span></span>
        <span class="fhave">${amountText(x)}</span></button>`).join('')}
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
      ${scannedFoods().length? `<button class="${foodCat==='scanned'?'on':''}" data-foodcat="scanned">Scanned</button>`:''}
    </div>`}
    <div id="foodList">${foodListHTML()}</div>
    <div class="fdone"><button class="sheetcta" id="foodDone">${foodCameFromLog?'Back to the log':'Done'}</button></div>`;
  foodSearching();
}
/* Adding a food you have not got in the list, without leaving the sheet. */
/* Fibre today: what counted, what did not, where it came from, and why 30g */
function fibreSheetHtml(k){
  const fi=fibreInfo(k), tg=(S.targets||{}).fibre||30, items=dayFood(k);
  const top=items.map(x=>({n:x.n,g:(fibreOf(x)||0)*x.q})).filter(x=>x.g>=0.5).sort((a,b)=>b.g-a.g).slice(0,4);
  const gram=Math.round(fi.g), gap=Math.max(0,tg-gram);
  return `<div style="padding:0 14px 10px">
    <div class="fhead"><div><b>${gram}</b>g fibre today</div><div>target ${tg}g</div></div>
    <div class="bar" style="margin:4px 0 12px"><i style="width:${Math.min(100,Math.round(fi.g/tg*100))}%;background:var(--cta)"></i></div>
    ${top.length? `<div class="slab">Where it came from</div>${top.map(x=>`<div class="note" style="margin:2px 0"><b>${escHabit(x.n)}</b> ${Math.round(x.g*10)/10}g</div>`).join('')}` : ''}
    ${fi.unknown? `<div class="note">${fi.unknown} thing${fi.unknown===1?' has':'s have'} no fibre figure (your own numbers, or a food added before fibre was counted), so the real total is higher.</div>` : ''}
    ${fi.rough? `<div class="note">Mixed dishes, takeaways and protein bars vary with the recipe, so their fibre is a typical value.</div>` : ''}
    ${fi.n&&gap? `<div class="note">${gap}g to go. Easy ways to get there: a pear (5.5g), half a tin of beans (7.5g), a bowl of porridge (4g), peas or broccoli with dinner (3 to 5g), wholemeal bread over white (2.5g against 1g a slice).</div>` : ''}
    ${fi.n&&!gap? `<div class="note">Target met.</div>` : ''}
    <div class="slab">Why 30g</div>
    <div class="note">30g a day is the UK recommendation (SACN, 2015); Europe's food safety authority sets 25g. A review of 185 studies and 58 trials found people eating 25 to 29g a day had 15 to 30% lower rates of death, heart disease, stroke, type 2 diabetes and bowel cancer than those eating least (Reynolds and colleagues, Lancet, 2019). Most of that evidence is observational: a strong association, not proof. Go up gradually and drink with it, or your gut will let you know.</div>
  </div>`;
}
function openFibre(k){
  k=k||foodKey();
  document.getElementById('altTitle').textContent='Fibre';
  document.getElementById('altSub').textContent=k===todayKey()? 'Counted from what you logged.' : 'Counted from what you logged on '+prettyDate(k)+'.';
  document.getElementById('altBody').innerHTML=fibreSheetHtml(k);
  openSheet('altSheet');
}
document.addEventListener('click',e=>{ if(e.target.closest('#fibreWhy')) openFibre(); });
/* the Eat tab's fibre bar opens the same sheet for the day it is showing */
document.addEventListener('click',e=>{ const fw=e.target.closest('[data-fibrewhy]'); if(fw) openFibre(fw.dataset.fibrewhy); });
function drawFoodNew(){
  foodAdding=true;
  $('foodBody').innerHTML=`
    <div class="slab">Something of your own</div>
    <div class="nf" style="margin-bottom:10px"><label>What is it</label>
      <input id="nfName" value="${(foodQuery||'').replace(/"/g,'&quot;')}" placeholder="Mam's brown bread" style="font-family:var(--font-ui);font-size:15px;font-weight:600"></div>
    <div class="nf" style="margin-bottom:10px"><label>One portion is</label>
      <input id="nfUnit" placeholder="slice, bowl, 100g" style="font-family:var(--font-ui);font-size:15px;font-weight:600"></div>
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
/* ---------- adding a food: one screen, MyFitnessPal's flow done better (build 75) ----------
   Feargal found the build 73 controls worse (g, ½ and + on every row, a
   stepper on the plate, a separate box) and asked for MyFitnessPal's flow,
   improved. MyFitnessPal: tap a search result for its food screen (serving
   size, number of servings, meal, a calorie and macro ring, a tick to add),
   or tap + on the result to log one serving; tap a diary entry for the same
   screen to change it. What it gets wrong, and what this does instead:
   - Serving size times number of servings is two fields for one question
     ("150g" means picking "1 g" then typing 150). Here it is one amount
     with its unit: 150 g, 3 eggs, 2 slices.
   - The unit of a logged entry cannot be changed there; here any unit can be
     picked at any time and the amount converts, so the weight stays the same.
   - The phone keyboard covers half the screen. Here a keypad is part of the
     screen, so the ring, the meal and Add stay in view, and the first key
     replaces the number.
   - It shows the food's share of the day; here the line under the ring says
     where the day ends up after it, against your target.
   - + on a result logs a default serving; here it logs what you had last
     time, and the toast offers Change.
   Every row is now one tap to open (the whole row), with one + for the
   quick add; entries on the plate open the same screen with Save and
   Remove. */
let foodAmt=null;
const lastAmts=()=>(S.foodLast&&typeof S.foodLast==='object')? S.foodLast : {};
function amtBase(f){ const g=portionG(f); return g? {per:g,u:unitOf(f)} : {per:1,u:''}; }
/* the units a food can be measured in: its base (g or ml), its own portion
   (an egg, a slice, a bowl) and the household weights from the tables */
function unitsFor(f){
  const {per,u}=amtBase(f), out=[], seen=new Set();
  const add=(k,label,g,note)=>{ const key=label.toLowerCase(); if(!seen.has(key)&&g>0){ seen.add(key); out.push({k,label,g,note}); } };
  if(!u){ add('por',f.u||'portion',1,''); return out; }
  add('base',u,1,'');
  /* an everyday food's own portion, unless that portion is just a weight
     (150g is already a weight, so a "portion" button would say nothing new) */
  if(f.src!=='usda'&&!/^\d+(\.\d+)?\s?(g|ml)\b/i.test(String(f.u))) add('por',String(f.u).replace(/^(a|one) /i,''),per,amtNum(per)+u);
  (f.por||[]).forEach((p,i)=>{ let l=String(p[0]).replace(/^(\d+(\.\d+)?|half) /,''); const n=parseFloat(p[0])||(/^half/.test(p[0])? 0.5 : 1);
    add('h'+i,l,p[1]/n,amtNum(p[1]/n)+u); });
  return out;
}
const unitOfKey=(f,k)=>unitsFor(f).find(x=>x.k===k)||unitsFor(f)[0];
const counted=f=>!weighed(f)&&!!portionG(f);
/* what + adds and what the screen opens on: last time, else one portion */
function lastFor(f){
  const l=lastAmts()[f.id];
  if(typeof l==='number'&&l>0) return {g:l,k:'base'};
  if(l&&+l.g>0) return {g:+l.g,k:l.k||'base'};
  return null;
}
function quickAmt(f){
  const {per,u}=amtBase(f), l=lastFor(f);
  if(l&&u){ const un=unitOfKey(f,l.k); return {q:+(l.g/per).toFixed(4), label:un.k==='base'? amtNum(l.g)+u : amtNum(l.g/un.g)+' '+un.label}; }
  /* build 76: a scanned product's first + is one of the label's servings */
  const sv=scanServing(f); if(sv) return {q:+(sv.g/per).toFixed(4), label:'1 '+sv.label};
  return {q:1, label: u? (counted(f)? '1 '+f.u : amtNum(per)+u) : '1 '+(f.u||'portion')};
}
function amtCurrent(){ const a=foodAmt; return a? dayFood(foodKey()).find(x=>x.id===a.id&&(x.meal||'s')===a.origMeal) : null; }
const amtVal=()=>{ const v=parseFloat(String(foodAmt.str||'').replace(',','.')); return isFinite(v)&&v>0? v : 0; };
/* grams (or ml, or portions when there is no weight) for what is typed */
function amtGrams(){ const f=foodOf(foodAmt.id), un=unitOfKey(f,foodAmt.k); return amtVal()*un.g; }
function fmtN(v){ const r=Math.round(v*100)/100; return String(r>=100? Math.round(r) : r); }
function openFoodAmount(id,meal,edit){
  const f=foodOf(id); if(!f) return;
  const m=meal||foodSlot, cur=edit? dayFood(foodKey()).find(x=>x.id===id&&(x.meal||'s')===m) : null;
  const {per}=amtBase(f);
  let k, g;
  if(cur){ g=cur.q*per; k=(cur.uk&&unitsFor(f).some(x=>x.k===cur.uk))? cur.uk : (counted(f)&&Math.abs(cur.q*2-Math.round(cur.q*2))<1e-6? 'por' : unitsFor(f)[0].k); }
  else { const l=lastFor(f), sv=scanServing(f), su=sv&&unitsFor(f).find(x=>x.k==='h0');
    if(l){ g=l.g; k=unitsFor(f).some(x=>x.k===l.k)? l.k : 'base'; }
    /* build 76: a scanned product opens on one of the label's servings */
    else if(su){ g=su.g; k='h0'; }
    else { g=per; k=counted(f)? 'por' : unitsFor(f)[0].k; } }
  const un=unitOfKey(f,k);
  foodAmt={id,meal:m,origMeal:m,edit:!!cur,k:un.k,str:fmtN(g/un.g),fresh:true};
  drawFoodAmount();
}
function ringSvg(f,q){
  const c=f.c*q*4, fa=f.f*q*9, p=f.p*q*4, tot=c+fa+p, R=34, L=2*Math.PI*R;
  let off=0;
  const arc=(v,col)=>{ if(!tot||v<=0) return ''; const len=v/tot*L, el=`<circle r="${R}" cx="44" cy="44" fill="none" stroke="var(--${col})" stroke-width="9" stroke-dasharray="${len.toFixed(1)} ${(L-len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 44 44)"/>`; off+=len; return el; };
  return `<svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true"><circle r="${R}" cx="44" cy="44" fill="none" stroke="var(--track)" stroke-width="9"/>${arc(c,'carbs')}${arc(fa,'fat')}${arc(p,'coral')}</svg>`;
}
function amtLiveHtml(){
  const a=foodAmt, f=foodOf(a.id), {per,u}=amtBase(f), q=amtGrams()/per, teen=isTeen();
  const r=n=>Math.round(n*q*10)/10, kc=Math.round(f.kcal*q);
  if(teen) return `<div class="aq-teen"><b>${Math.round(r(f.p))}</b>g protein${typeof f.fb==='number'? ' · '+r(f.fb)+'g fibre' : ''}</div>`;
  const c=f.c*q*4, fa=f.f*q*9, p=f.p*q*4, tot=c+fa+p||1, pc=v=>Math.round(v/tot*100)+'%';
  /* where the day ends up after this one (a change replaces what was there) */
  const k=foodKey(), t=foodTotals(k), cur=amtCurrent(), tg=S.targets||{};
  const base={kcal:t.kcal-(cur? cur.kcal*cur.q : 0), p:t.protein-(cur? cur.p*cur.q : 0)};
  const dayK=Math.round(base.kcal+f.kcal*q), dayP=Math.round(base.p+f.p*q);
  return `<div class="aqring">${ringSvg(f,q)}<div class="aqk"><b>${num(kc)}</b><span>kcal</span></div></div>
    <div class="aqmac">
      <div><i style="background:var(--carbs)"></i><span>Carbs</span><b>${fmtN(r(f.c))}g</b><small>${pc(c)}</small></div>
      <div><i style="background:var(--fat)"></i><span>Fat</span><b>${fmtN(r(f.f))}g</b><small>${pc(fa)}</small></div>
      <div><i style="background:var(--coral)"></i><span>Protein</span><b>${fmtN(r(f.p))}g</b><small>${pc(p)}</small></div>
      ${typeof f.fb==='number'? `<div class="aqfb"><span>Fibre ${fmtN(r(f.fb))}g</span></div>` : ''}
    </div>
    <div class="aqday">${k===todayKey()? 'Today' : 'That day'} with this: <b>${num(dayK)}</b>${tg.kcal? ' of '+num(tg.kcal) : ''} kcal · <b>${dayP}</b>${tg.protein? ' of '+tg.protein : ''}g protein</div>`;
}
function amtNumHtml(){
  const a=foodAmt, f=foodOf(a.id), un=unitOfKey(f,a.k), {u}=amtBase(f);
  const v=amtVal(), g=amtGrams();
  const word= un.k==='base'? un.label : (v===1? un.label : plural(un.label));
  return `<span class="aqv${a.fresh?' fresh':''}">${escHabit(a.str||'0')}</span><span class="aqu">${escHabit(word)}</span>
    ${un.k!=='base'&&u&&v? `<span class="aqeq">= ${amtNum(g)}${u}</span>` : ''}`;
}
const plural=w=>(/[\s\d,]/.test(w)||/^(large|medium|small|jumbo|standard|regular|half|whole)$/i.test(w)||/s$/.test(w))? w : (/(sh|ch|x)$/.test(w)? w+'es' : (/[^aeiou]y$/.test(w)? w.slice(0,-1)+'ies' : w+'s'));
function amtChipsHtml(){
  const a=foodAmt, f=foodOf(a.id), un=unitOfKey(f,a.k), {u}=amtBase(f), out=[], seen=new Set();
  const add=(label,v)=>{ const key=+v.toFixed(3); if(v>0&&!seen.has(key)){ seen.add(key); out.push([label,key]); } };
  const l=lastFor(f); if(l&&u){ const n=l.g/un.g; add('Last time · '+fmtN(n)+(un.k==='base'? un.label : ' '+(n===1? un.label : plural(un.label))),n); }
  const pres= un.k==='base'? (u==='ml'? (f.alc? [175,330,500,568] : [100,200,250,330,500]) : [25,50,100,150,200]) : [0.5,1,2,3];
  pres.forEach(v=>add(un.k==='base'? (v===568? 'Pint' : v+un.label) : qtyText(v),v));
  return out.map(([lab,v])=>`<button data-amtset="${v}" class="${Math.abs(v-amtVal())<1e-6?'on':''}">${escHabit(lab)}</button>`).join('');
}
function drawFoodAmount(){
  const a=foodAmt, f=a&&foodOf(a.id);
  if(!f){ foodAmt=null; drawFood(); return; }
  const units=unitsFor(f);
  $('foodBody').innerHTML=`<div class="famt" role="group" aria-label="How much ${escHabit(f.n)}">
    <div class="aqtop"><button class="inlinebtn amtback" data-amtback>‹ Back</button>
      ${a.edit? `<button class="inlinebtn aqrm" data-amtremove>Remove</button>` : ''}</div>
    <div class="famthead"><b>${escHabit(f.n)}</b><small${isScanned(f)? ' class="famtsrc"' : ''}>${foodSource(f)}${(f.src==='usda'||isScanned(f))&&!isTeen()? ', per 100'+amtBase(f).u+' '+fmtN(f.kcal)+' kcal' : ''}</small>
      ${isScanned(f)? `<small class="famtlabel">${f.srv? 'Label serving: '+escHabit(f.srv)+' · ' : ''}<button class="inlinebtn" data-scanedit="${escHabit(f.code)}">Wrong? Fix it from the label</button></small>` : ''}</div>
    <div class="aqlive" id="amtLive" aria-live="polite">${amtLiveHtml()}</div>
    <div class="aqamt"><div class="aqnum" id="amtNum">${amtNumHtml()}</div>
      ${units.length>1? `<div class="aqunits" role="radiogroup" aria-label="Measured in">${units.map(x=>`<button role="radio" aria-checked="${x.k===a.k}" class="${x.k===a.k?'on':''}" data-amtunit="${x.k}">${escHabit(x.label)}${x.note? `<small>${x.note}</small>` : ''}</button>`).join('')}</div>` : ''}
    </div>
    <div class="pickchips famtchips" id="amtChips">${amtChipsHtml()}</div>
    <div class="aqpad">${['1','2','3','4','5','6','7','8','9','.','0','del'].map(k=>`<button data-kp="${k}" aria-label="${k==='del'? 'Delete' : (k==='.'? 'Point' : k)}">${k==='del'? '⌫' : k}</button>`).join('')}</div>
    <div class="aqmeal mealtabs" role="tablist" aria-label="Which meal">${MEALS.map(([id,label])=>`<button role="tab" aria-selected="${a.meal===id}" class="${a.meal===id?'on':''}" data-amtmeal="${id}"><span>${label}</span></button>`).join('')}</div>
    <button class="sheetcta" id="amtSave"${amtVal()? '' : ' disabled'}>${amtCta()}</button>
  </div>`;
  const b=$('foodBody'); if(b) b.classList.remove('q');
  /* the food's own screen: the sheet's title steps aside and it opens at the top */
  const sh=$('foodSheet'); if(sh){ sh.classList.add('amtmode'); sh.scrollTop=0; }
}
function amtCta(){
  const a=foodAmt; if(!amtVal()) return 'Type how much';
  const mealName=MEALS.find(m=>m[0]===a.meal)[1];
  return a.edit? (a.meal!==a.origMeal? 'Move to '+mealName.toLowerCase() : 'Save') : 'Add to '+mealName.toLowerCase();
}
/* only the parts that change are redrawn, so taps on the keypad are instant */
function amtRefresh(){
  const n=$('amtNum'), l=$('amtLive'), c=$('amtChips'), b=$('amtSave');
  if(n) n.innerHTML=amtNumHtml(); if(l) l.innerHTML=amtLiveHtml(); if(c) c.innerHTML=amtChipsHtml();
  if(b){ b.textContent=amtCta(); b.disabled=!amtVal(); }
}
function amtKey(k){
  const a=foodAmt; if(!a) return;
  let s2=a.fresh? '' : String(a.str||'');
  if(k==='del'){ s2=(a.fresh? '' : s2.slice(0,-1)); }
  else if(k==='.'){ if(s2.indexOf('.')<0) s2=(s2||'0')+'.'; }
  else { if(s2==='0') s2=''; const dec=s2.split('.')[1]; if(s2.replace('.','').length<5&&!(dec&&dec.length>=2)) s2+=k; }
  a.str=s2; a.fresh=false; amtRefresh();
}
function saveFoodAmount(){
  const a=foodAmt, f=a&&foodOf(a.id); if(!f) return;
  const v=amtVal(), {per,u}=amtBase(f), g=amtGrams();
  if(!v){ toast('Type how much first'); return; }
  if(u&&g>5000){ toast('That is over 5 kilos. Check the number'); return; }
  const q=g/per, cur=amtCurrent(), mealName=MEALS.find(m=>m[0]===a.meal)[1].toLowerCase();
  if(a.edit&&cur&&a.meal===a.origMeal) setFoodQty(a.id,a.meal,q);
  else { if(a.edit&&cur) setFoodQty(a.id,a.origMeal,0); addFood(a.id,q,a.meal); }
  const row=dayFood(foodKey()).find(x=>x.id===a.id&&(x.meal||'s')===a.meal);
  if(row){ row.uk=a.k; save(); }
  if(u){ const l=Object.assign({},lastAmts()); l[f.id]={g:Math.round(g*10)/10,k:a.k};
    const keys=Object.keys(l); if(keys.length>300) delete l[keys[0]];
    S.foodLast=l; save(); }
  foodSlot=a.meal; foodAmt=null; drawFood(); renderAll();
  if(typeof drawDay==='function'&&document.getElementById('dayCheck').classList.contains('on')) drawDay();
  const amt=row? amountText(row) : '';
  toast(a.edit? f.n.split(',')[0]+' now '+amt+(a.meal!==a.origMeal? ', in '+mealName : '') : f.n.split(',')[0]+', '+amt+' added to '+mealName);
}
document.addEventListener('click',e=>{
  const fo=e.target.closest('[data-foodopen]');
  if(fo){ const parts=fo.dataset.foodopen.split('|'), meal=parts.length>1? parts.pop() : null;
    openFoodAmount(parts.join('|'), meal||foodSlot, !!meal); return; }
  if(!foodAmt) return;
  if(e.target.closest('[data-amtback]')){ foodAmt=null; drawFood(); return; }
  const kp=e.target.closest('[data-kp]'); if(kp){ amtKey(kp.dataset.kp); return; }
  const un=e.target.closest('[data-amtunit]');
  if(un){ const f=foodOf(foodAmt.id), g=amtGrams(), nu=unitOfKey(f,un.dataset.amtunit);
    foodAmt.k=nu.k; foodAmt.str=g? fmtN(g/nu.g) : ''; foodAmt.fresh=true; drawFoodAmount(); return; }
  const cs=e.target.closest('[data-amtset]');
  if(cs){ foodAmt.str=fmtN(+cs.dataset.amtset); foodAmt.fresh=true; amtRefresh(); return; }
  const ml=e.target.closest('[data-amtmeal]');
  if(ml){ foodAmt.meal=ml.dataset.amtmeal; document.querySelectorAll('[data-amtmeal]').forEach(x=>{ const on=x.dataset.amtmeal===foodAmt.meal; x.classList.toggle('on',on); x.setAttribute('aria-selected',on); }); amtRefresh(); return; }
  if(e.target.closest('#amtSave')){ saveFoodAmount(); return; }
  if(e.target.closest('[data-amtremove]')){
    const a=foodAmt, cur=amtCurrent(); if(!cur) return;
    const before=JSON.parse(JSON.stringify(cur)), dk=foodKey();
    setFoodQty(a.id,a.origMeal,0); foodAmt=null; drawFood(); renderAll();
    toast(before.n.split(',')[0]+' removed','Undo',()=>{ S.days[dk]=S.days[dk]||{}; S.days[dk].food=(S.days[dk].food||[]).concat([before]);
      applyFoodTotals(dk); save(); drawFood(); renderAll(); });
    return; }
});
/* a computer keyboard works too: digits, point, backspace, Enter, Escape */
document.addEventListener('keydown',e=>{
  if(!foodAmt||!document.getElementById('amtNum')) return;
  if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(/^[0-9]$/.test(e.key)) { amtKey(e.key); e.preventDefault(); }
  else if(e.key==='.'||e.key===',') { amtKey('.'); e.preventDefault(); }
  else if(e.key==='Backspace') { amtKey('del'); e.preventDefault(); }
  else if(e.key==='Enter') { saveFoodAmount(); e.preventDefault(); }
});

document.addEventListener('click',e=>{
  if(e.target.closest('#foodBtn')) openFood(true);
  if(e.target.closest('#foodDone')) closeFood();
  const fc=e.target.closest('[data-foodcat]');
  if(fc){ foodCat=fc.dataset.foodcat; foodQuery=''; foodMore=false; drawFood(); return; }
  if(e.target.closest('[data-foodmore]')){ foodMore=true; drawFoodList(); return; }
  const fs=e.target.closest('[data-foodslot]');
  if(fs){ foodSlot=fs.dataset.foodslot; drawFood(); }
  if(e.target.closest('#foodYesterday')){
    const n=repeatYesterday();
    drawFood(); renderAll();
    toast(n? n+' things copied from '+(foodDay? 'the day before' : 'yesterday') : 'Nothing logged '+(foodDay? 'the day before' : 'yesterday')); }
  if(e.target.closest('#foodSaveMeal')){
    const label=MEALS.find(m=>m[0]===foodSlot)[1];
    const m=saveMealAs(label+' '+prettyDate(foodKey()),foodSlot);
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
  if(fa){ const [id,q]=fa.dataset.foodadd.split(':'), meal=foodSlot; addFood(id,+q);
    drawFood(); renderAll(); if(typeof drawDay==='function'&&document.getElementById('dayCheck').classList.contains('on')) drawDay();
    const r=dayFood(foodKey()).find(x=>x.id===id&&(x.meal||'s')===meal);
    if(r) toast(r.n.split(',')[0]+', '+amountText(r)+' in '+MEALS.find(m=>m[0]===meal)[1].toLowerCase(),'Change',()=>{ if(!document.getElementById('foodSheet').classList.contains('on')) openFood(false,{slot:meal}); openFoodAmount(id,meal,true); });
    return; }
  const fst=e.target.closest('[data-foodstep]');
  if(fst){
    const parts=fst.dataset.foodstep.split('|'), d=+parts.pop(), meal=parts.pop(), id=parts.join('|');
    const cur=dayFood(foodKey()).find(x=>x.id===id&&(x.meal||'s')===meal); if(!cur) return;
    const before=JSON.parse(JSON.stringify(cur));
    const next=stepQty(cur.q,d,weighed(cur));
    setFoodQty(id,meal,next);
    drawFood(); renderAll();
    const dk=foodKey();
    if(next<=0) toast(before.n+' taken off','Undo',()=>{
      const k=dk; S.days[k]=S.days[k]||{}; S.days[k].food=(S.days[k].food||[]).concat([before]);
      applyFoodTotals(k); save(); drawFood(); renderAll(); });
    return; }
  const sk=e.target.closest('[data-skipmeal]');
  if(sk){ skipMeal(foodKey(),sk.dataset.skipmeal,true); drawFood(); renderAll();
    toast(isTeen()? 'Noted. While you are growing, regular meals really help, so try not to make it a habit.' : 'Noted as skipped'); return; }
  const us=e.target.closest('[data-unskip]');
  if(us){ skipMeal(foodKey(),us.dataset.unskip,false); drawFood(); renderAll(); return; }
  if(e.target.closest('#foodQuickBtn')){ foodQuick=!foodQuick; drawFood();
    if(foodQuick){ const el=document.getElementById('qaKcal'); if(el) el.focus(); } return; }
  if(e.target.closest('#qaSave')){
    const kc=+document.getElementById('qaKcal').value, pr=+document.getElementById('qaP').value;
    if(!kc){ toast('Put the calories in first'); return; }
    quickAddFood(kc,pr,foodSlot); foodQuick=false; drawFood(); renderAll();
    toast(kc+' kcal added to '+MEALS.find(m=>m[0]===foodSlot)[1].toLowerCase()); return; }
  const fr=e.target.closest('[data-foodrm]');
  if(fr){ const i=+fr.dataset.foodrm, dk=foodKey(), gone=dayFood(dk)[i];
    removeFood(i); drawFood();
    if(gone) toast(gone.n+' removed','Undo',()=>{
      const k=dk; S.days[k]=S.days[k]||{};
      const list=(S.days[k].food||[]).slice(); list.splice(i,0,gone); S.days[k].food=list;
      applyFoodTotals(k); save(); drawFood(); renderAll(); }); }
});
document.addEventListener('input',e=>{
  /* Only the results redraw, so the input keeps its focus, its cursor and its
     composition state on its own. */
  if(e.target.id==='foodSearch'){ foodQuery=e.target.value; drawFoodList(); foodSearching(); }
});
/* build 59: only the list redraws while typing, so the plate, shortcuts and
   categories stayed above the results and pushed them under the keyboard.
   They step aside while there is text in the box. */
function foodSearching(){ const b=$('foodBody'); if(b) b.classList.toggle('q',!!foodQuery.trim()); }

