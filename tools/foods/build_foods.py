#!/usr/bin/env python3
"""Build src/js/foods-db.js from the USDA National Nutrient Database for
Standard Reference, Release 28 (the dataset FoodData Central now serves as
"SR Legacy"). Public domain, laboratory analysed, per 100 g.

Getting the source (the workspace cannot reach usda.gov, npm carries an
unmodified copy of the two files used here):
    npm pack fda-nutrient-database && tar xzf fda-nutrient-database-*.tgz
    python3 tools/foods/build_foods.py package/data

What it does, so the list is wide but readable rather than 8,789 rows of
"Beef, chuck, separable lean and fat, trimmed to 1/8 inch, select, braised":
  * leaves out baby foods, US restaurant chains and branded products, game few
    people here eat, offal, US meat grades (keeps "all grades"), "with salt"
    duplicates, dry mixes and anything without full energy and macros
  * rewrites names into plain Irish and UK English (courgette, prawns, crisps,
    biscuits, mince, yoghurt) and drops USDA filler words
  * carbohydrate is USDA's total less fibre, the way Irish and UK labels show
    it; energy is USDA's own figure
  * drinks, milk and juices are per 100 ml, converted with the food's own
    measured density from its cup or fluid ounce weight
  * household measures (a slice, a large egg, a tablespoon) are kept in grams
Output rows: [id, name, cat, kcal, protein, carbs, fat, fibre|null, unit,
portions] per 100 g or 100 ml, where portions is [[label, grams], ...].
"""
import json, re, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else 'package/data'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'js', 'foods-db.js')

def rows(name):
    with open(os.path.join(SRC, name), encoding='latin-1') as fh:
        for line in fh:
            yield [x.strip('~') for x in line.rstrip('\r\n').split('^')]

des = {f[0]: f for f in rows('FOOD_DES.txt')}
ab = {f[0]: f for f in rows('ABBREV.txt')}

SKIP_GROUPS = {'0300', '3500', '3600', '2100'}
BRAND = re.compile(r"\b[A-Z][A-Z'&]{2,}\b")
DROP = re.compile('|'.join([
    r', with salt', r'\bwith salt\b(?!,? ?added)', r'dry mix', r'\bunprepared\b', r'refrigerated dough', r'\bdough\b',
    r'reduced[- ]calorie', r'low sodium', r'reduced sodium', r'no salt added', r'distilled water', r'\bimported\b',
    r'New Zealand', r'Australian', r'variety meats', r'by-products', r'giblets', r'\bneck\b', r'\bback\b',
    r'skin only', r'\bcapons?\b', r'roasting', r'stewing', r'composite of', r'\bchoice\b', r'\bselect\b', r'\bprime\b',
    r'1/8"', r'1/4"', r'separable fat', r'mechanically', r'with added solution', r'enhanced',
    r'\bbison\b', r'\bbuffalo\b', r'\belk\b', r'\bmoose\b', r'squirrel', r'beaver', r'\bbear\b', r'caribou', r'muskrat',
    r'opossum', r'raccoon', r'beefalo', r'\bboar\b', r'antelope', r'emu\b', r'ostrich', r'\bsquab\b', r'pheasant',
    r'\bquail\b', r'guinea hen', r'\bgoose\b', r'frog legs', r'turtle', r'whale', r'seal\b', r'walrus', r'bear\b',
    r'liver', r'kidney', r'brain', r'heart\b', r'tongue', r'tripe', r'lung', r'spleen', r'pancreas', r'thymus',
    r'chitterlings', r'\bfeet\b', r'\bears\b', r'\btail\b', r'hocks?\b', r'jowl', r'\bgizzard', r'condensed', r'soup.*\bdry\b', r'supplement',
    r'infant', r'toddler', r'formula', r'USDA Commodity', r'school lunch', r'Food Distribution',
    r'fast food', r'\bmenhaden\b', r'leavening', r'baking powder', r'yeast\b', r'cream of tartar',
    r'shortening', r'\blard\b', r'tallow', r'household', r'industrial', r'\bfrozen, unprepared',
    r'dehydrated', r'freeze-dried', r'\bpowder\b(?!.*protein)', r'canned, solids and liquids',
    r'(?<!not )(?<!un)fortified', r'\b(Wip|Creamsicle|Pockets|Powerade|Ion4|Pastelitos|Franks|Pot Pie|Ready Crust|Latino|Leche|Kiwi Strawberry|Commercially Prepared|Cookie-type|Pastries|Fat Free|Whipped Topping)\b', r'pressure cooked', r'microwaved', r'\bdrained, with', r'\bpickled\b(?!.*herring)', r'\bsprouted\b',
    r'Fungi, Cloud', r'^Milk, filled', r'lauric', r'^Milk substitutes', r'Milk, human', r'nonfat milk solids', r'skunk', r'swamp', r'\bseaweed\b', r'\balgae\b', r'\bspirulina\b', r'\bagar\b',
    r'Alaska Native', r'Hawaii', r'Puerto Rican', r'Mexican style', r'Babyfood', r'baby\b(?!.*(carrots|spinach|corn))',
    r'\bdessert topping', r'imitation', r'\bsubstitute\b', r'meatless', r'nondairy', r'non-dairy', r'\bcoffeemate',
    r'gluten-free', r'\blow calorie\b', r'unenriched', r'\bwithout added', r'NFS', r'not further specified',
    r'^Leavening', r'^Shortening', r'^Margarine-like', r'^Oil, industrial', r'^Fat, ', r'^Beverages, .*\bmix\b',
    r'Biscuits,', r'with cheese food', r'cheese food', r'cheese product', r'cheese spread, pasteurized process',
]), re.I)

SUBS = [
    (r'distilled, all \(gin, rum, vodka, whiskey\) (\d+) proof', lambda m: 'Spirits, gin, vodka, rum or whiskey, %d%%' % round(int(m.group(1)) / 2)),
    (r', with added [^,]*vitamin[^,]*', ''), (r', with added calcium[^,]*', ''), (r', fluid', ''), (r', not fortified', ''),
    (r'Cereals, oats, regular and quick, (dry|cooked with water)', lambda m: 'Porridge oats, ' + ('dry' if m.group(1) == 'dry' else 'made with water')),
    (r'\s*\(Includes[^)]*\)', ''), (r'\s*\(formerly[^)]*\)', ''), (r'\s*\(USDA[^)]*\)', ''),
    (r', broilers or fryers', ''), (r'broilers or fryers, ', ''), (r', meat only', ''), (r', separable lean only', ', lean'),
    (r', separable lean and fat', ''), (r', all grades', ''), (r', trimmed to 0" fat', ''), (r', boneless', ''),
    (r', drained', ''), (r', without salt', ''), (r', commercially prepared', ''), (r', commercial', ''),
    (r', mature seeds', ''), (r', ready-to-serve', ''), (r', ready-to-drink', ''), (r', prepared with tap water', ''),
    (r', enriched', ''), (r', regular', ''), (r', fresh', ''), (r', from whole bird', ''), (r', retail cuts', ''),
    (r', all commercial varieties', ''), (r', all varieties', ''), (r', mixed species', ''), (r', not reconstituted', ''),
    (r', bone and skin removed', ''), (r', bone removed', ''), (r', home-prepared', ', homemade'), (r'prepared-from-recipe', 'homemade'),
    (r', with skin', ', skin on'), (r', without skin', ', skinless'), (r'^Beverages, ', ''), (r'^Alcoholic [Bb]everages?, ', ''),
    (r'^Snacks, ', ''), (r'^Candies, ', 'Sweets, '), (r'^Cereals ready-to-eat, ', 'Cereal, '), (r'^Cereals, ', ''),
    (r'^Spices, ', ''), (r'^Fish, ', ''), (r'^Mollusks, ', ''), (r'^Crustaceans, ', ''), (r'^Nuts, ', ''), (r'^Seeds, ', ''),
    (r'^Carbonated beverage, ', ''), (r'^Salad dressing, ', 'Dressing, '), (r'^Oil, ', 'Oil, '),
    (r'Squash, (?:summer, )?zucchini(?:, includes skin)?', 'Courgette'), (r'Squash, winter, butternut', 'Butternut squash'),
    (r'\bCookies\b', 'Biscuits'), (r'\bcookies\b', 'biscuits'), (r'\bcookie\b', 'biscuit'), (r'Zucchini', 'Courgette'), (r'zucchini', 'courgette'),
    (r'Eggplant', 'Aubergine'), (r'Cilantro', 'Coriander'), (r'Scallions?', 'Spring onions'), (r'Shrimp', 'Prawns'), (r'shrimp', 'prawns'),
    (r'Chickpeas \(garbanzo beans, bengal gram\)', 'Chickpeas'), (r'Arugula', 'Rocket'), (r'Rutabagas', 'Swede'),
    (r'Catsup', 'Ketchup'), (r'French fried', 'Chips,'), (r'Potato chips', 'Crisps'), (r'potato chips', 'crisps'),
    (r'Beef, ground', 'Beef mince'), (r'Pork, ground', 'Pork mince'), (r'Turkey, ground', 'Turkey mince'), (r'Lamb, ground', 'Lamb mince'),
    (r'Chicken, ground', 'Chicken mince'), (r'Yogurt', 'Yoghurt'), (r'yogurt', 'yoghurt'), (r'flavored', 'flavoured'), (r'Flavored', 'Flavoured'),
    (r'\bcolor', 'colour'), (r'\bflavor', 'flavour'), (r'fiber', 'fibre'), (r'center', 'centre'), (r'Lima beans', 'Butter beans'), (r'Navy beans', 'Haricot beans'),
    (r'Beans, snap, green', 'Green beans'), (r'Beans, snap, yellow', 'Yellow beans'), (r'Peppers, sweet, ', 'Peppers, '),
    (r'Corn, sweet, (yellow|white)', 'Sweetcorn'), (r'Cornstarch', 'Cornflour'), (r'Sugars, powdered', 'Icing sugar'),
    (r'Sugars, granulated', 'Sugar, white'), (r'Sugars, brown', 'Sugar, brown'), (r'Jams and preserves', 'Jam'),
    (r'Lettuce, cos or romaine', 'Lettuce, cos'), (r'Cantaloupe', 'Cantaloupe melon'), (r'Melons, cantaloupe', 'Cantaloupe melon'),
    (r'Cola', 'Cola'), (r'Club soda', 'Soda water'), (r'Bell peppers', 'Peppers'), (r'Snow peas', 'Mangetout'),
    (r'Peas, edible-podded', 'Mangetout'), (r'Beets', 'Beetroot'), (r'beets', 'beetroot'), (r'Garbanzo', 'Chickpea'),
    (r'Frankfurter', 'Hot dog sausage'), (r'Bologna', 'Luncheon meat'), (r'Candied', 'Glacé'), (r'Molasses', 'Black treacle'),
    (r'Syrups, maple', 'Maple syrup'), (r'Graham', 'Digestive style'), (r'Bagels', 'Bagel'), (r'Rolls, ', 'Rolls, '),
    (r'Pasta, ', 'Pasta, '), (r'Rice, white, long-grain', 'Rice, white, long grain'), (r'pan-broiled', 'pan fried'),
    (r'broiled', 'grilled'), (r'Broiled', 'Grilled'), (r'\bcooked, roasted', 'roasted'), (r'\bcooked, braised', 'braised'),
    (r'\bcooked, grilled', 'grilled'), (r'\bcooked, boiled', 'boiled'), (r'\bcooked, baked', 'baked'), (r'\bcooked, fried', 'fried'),
    (r'\bcooked, stewed', 'stewed'), (r'\bcooked, steamed', 'steamed'), (r'\bcooked, dry heat', 'cooked'), (r'\bcooked, moist heat', 'cooked'),
    (r'\bcooked, pan fried', 'pan fried'), (r'\bcooked, simmered', 'simmered'), (r'Wheat flour', 'Flour'), (r'\bwhite, all-purpose', 'plain'),
    (r'Oats', 'Oats'), (r'Alcoholic beverage', 'Drink'), (r'beer, ', 'Beer, '), (r'^beer', 'Beer'), (r'^wine', 'Wine'),
    (r'\(.*?\)', ''), (r', (?:[A-E], )*[A-E](?=,|$)', ''), (r', includes from concentrate', ''), (r'\s+,', ','), (r',\s*,', ','), (r'\s{2,}', ' '), (r',\s*$', ''),
]

CATS = {'0100': 'dairy', '0200': 'sauces', '0400': 'sauces', '0500': 'meat', '0700': 'meat', '1000': 'meat',
        '1300': 'meat', '1500': 'fish', '1700': 'meat', '0800': 'breakfast', '0900': 'veg', '1100': 'veg',
        '1200': 'pulses', '1600': 'pulses', '1400': 'drinks', '1900': 'snacks', '2000': 'carbs', '2200': 'meals',
        '2500': 'snacks'}

def category(g, name):
    n = name.lower()
    if g == '0600':
        return 'meals' if n.startswith('soup') else 'sauces'
    if g == '1100' and re.match(r'(potato|sweet potato|yam|parsnip|chips)', n):
        return 'carbs'
    if g == '1800':
        return 'carbs' if re.match(r'(bread|roll|bagel|tortilla|pitta|pita|english muffin|crumpet|naan|crackers|crispbread|rusk|matzo|croutons|stuffing|breadcrumbs)', n) else 'snacks'
    if g == '1500' and n.startswith('mollusk'):
        return 'fish'
    return CATS.get(g)

def num(x):
    try:
        return float(x)
    except ValueError:
        return None

def clean(name):
    for a, b in SUBS:
        name = re.sub(a, b, name)
    name = name.strip(' ,')
    return name[:1].upper() + name[1:]

PORTION_OK = re.compile(r'\b(slice|large|medium|small|extra large|jumbo|tbsp|tsp|piece|fillet|breast|thigh|drumstick|wing|bar|pat|roll|bagel|muffin|biscuit|cookie|fruit|leg|chop|steak|sausage|link|patty|egg|clove|stalk|spear|floret|leaf|bun|pancake|waffle|tortilla|wrap|scoop|square|wedge|crumpet|bulb|head|ear|potato|banana|apple|orange|pear|peach|plum|kiwi|nectarine|tomato|carrot|onion|pepper|avocado|lemon|lime|serving packet|sachet|cracker|crispbread|biscuit)\b', re.I)
PORTION_NO = re.compile(r'\b(oz|lb|cup|package|container|NLEA|serving|pint|quart|gallon|fl)\b', re.I)

def portions(f):
    out = []
    for gi, di in ((48, 49), (50, 51)):
        g, d = num(f[gi]) if gi < len(f) else None, f[di] if di < len(f) else ''
        if not g or not d or PORTION_NO.search(d) or not PORTION_OK.search(d):
            continue
        d = re.sub(r'\s*\(.*?\)', '', d).replace('  ', ' ').strip()
        d = re.sub(r'^1 ', '', d)
        d = re.sub(r',? ?(without refuse|with liquid|or 1 packet)', '', d).strip(' ,')
        d = re.sub(r'^\.5 ', 'half ', d)
        d = d.replace('tbsp', 'tablespoon').replace('tsp', 'teaspoon')
        out.append([d, round(g, 1)])
    return out

def density(f):
    for gi, di in ((48, 49), (50, 51)):
        g, d = num(f[gi]), f[di]
        if not g or not d:
            continue
        m = re.match(r'([\d.]+)\s*(fl oz|cup)', d)
        if m:
            vol = float(m.group(1)) * (29.5735 if m.group(2) == 'fl oz' else 236.588)
            r = g / vol
            if 0.85 <= r <= 1.45:
                return r
    return None

def liquid(g, name, water):
    n = name.lower()
    if g == '1400':
        if re.search(r'prepared with', n):
            return True
        return not re.search(r'(powder|instant|dry|syrup|concentrate|mix|crystals|ground|beans)', n)
    if g == '0100':
        return bool(re.match(r'milk\b', n)) and not re.search(r'(dry|dried|powder|condensed|evaporated|chocolate syrup|bar|dessert)', n) or n.startswith('buttermilk') or n.startswith('kefir')
    if g == '0900':
        return 'juice' in n and not re.search(r'(frozen|undiluted|pack)', n)
    return False

out, seen = [], {}
for k, d in sorted(des.items()):
    g, long = d[1], d[2]
    if g in SKIP_GROUPS or d[5] or BRAND.search(long) or DROP.search(long):
        continue
    a = ab.get(k)
    if not a:
        continue
    kcal, p, f, c, fb, water = (num(a[i]) for i in (3, 4, 5, 7, 8, 2))
    if None in (kcal, p, f, c):
        continue
    if g == '1300' and not re.search(r'(raw|cooked|grilled|roasted|braised|fried|stewed|simmered|baked|broiled)', long, re.I):
        continue
    name = clean(long)
    cat = category(g, name)
    if not cat or len(name) < 3:
        continue
    lq = liquid(g, long, water)
    rho = 1.0
    if lq:
        rho = density(a) or 1.0
    carbs = max(0.0, c - (fb or 0.0))
    per = rho  # per 100 ml = per 100 g x density
    row = {
        'id': 'u' + k, 'n': name, 'cat': cat,
        'kcal': round(kcal * per), 'p': round(p * per, 1), 'c': round(carbs * per, 1), 'f': round(f * per, 1),
        'fb': (round(fb * per, 1) if fb is not None else None), 'm': 'ml' if lq else 'g',
        'por': portions(a), 'grp': g,
    }
    # fibre unknown: zero only where the food cannot carry any
    if row['fb'] is None:
        if g in ('0100', '0500', '0700', '1000', '1300', '1500', '1700') or (g == '1400' and row['c'] < 1) or g == '0400':
            row['fb'] = 0.0
        else:
            continue
    if g == '1400' and re.search(r'(beer|wine|proof|liqueur|alcoholic|cocktail|daiquiri|margarita|colada|whiskey|creme de|malt liquor)', long, re.I):
        row['alc'] = round(max(0.0, (row['kcal'] - (row['p'] * 4 + row['c'] * 4 + row['f'] * 9)) / 7), 1)
    key = name.lower()
    if key in seen:
        continue
    seen[key] = 1
    out.append(row)

# keep the list browsable: cap any one name stem (the first two comma parts)
stems = {}
final = []
for r in out:
    parts = [x.strip() for x in r['n'].split(',')]
    stem = ', '.join(parts[:2]).lower()
    stems[stem] = stems.get(stem, 0) + 1
    if stems[stem] > 6:
        continue
    final.append(r)

cats = {}
for r in final:
    cats[r['cat']] = cats.get(r['cat'], 0) + 1

def esc(s):
    return json.dumps(s, ensure_ascii=False)

def n(x):
    s = ('%.1f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'

lines = []
for r in final:
    lines.append('[' + ','.join([esc(r['id']), esc(r['n']), esc(r['cat']), str(r['kcal']), n(r['p']), n(r['c']), n(r['f']),
                 n(r['fb']), esc(r['m']), json.dumps(r['por'], ensure_ascii=False, separators=(',', ':'))]
                 + ([n(r['alc'])] if r.get('alc') else [])) + ']')

head = '''/* ---------- the verified food list (build 73) ----------
   %d foods from the USDA National Nutrient Database for Standard Reference,
   Release 28 (served today by FoodData Central as "SR Legacy"): laboratory
   analysed values, public domain. Built by tools/foods/build_foods.py, which
   says what was left out and why; do not edit by hand, run the script.
   Each row is per 100 g, or per 100 ml for drinks, milk and juices:
   [id, name, category, kcal, protein, carbs, fat, fibre, unit, portions,
   alcohol (drinks only)].
   Carbs are USDA's total less fibre, as on Irish and UK labels. Portions are
   USDA's own household weights, in grams. */
const FOODS_DB_ROWS=[
''' % len(final)
with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(head + ',\n'.join(lines) + '\n];\n')
print(len(final), cats, os.path.getsize(OUT))
