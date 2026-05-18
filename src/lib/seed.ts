import { v4 as uuid } from 'uuid';
import type { Table, Token, Product } from './types';

export function generateSeedData() {
  const tables: Table[] = [];
  const tokens: Token[] = [];

  // Create 6 tables
  for (let i = 1; i <= 6; i++) {
    tables.push({
      id: uuid(),
      name: `Table ${i}`,
      number: i,
      currentTokenId: null,
      currentSessionId: null,
    });
  }

  // Generate 1 token for Table 1 so admin can quickly test
  const table1Token: Token = {
    id: uuid(),
    tableId: tables[0].id,
    token: 'demo-table-1',
    isValid: true,
    createdAt: new Date().toISOString(),
    invalidatedAt: null,
    restoredAt: null,
  };
  tokens.push(table1Token);
  tables[0].currentTokenId = table1Token.id;

  const now = new Date().toISOString();

  const products: Product[] = [
    // Antipasti
    {
      id: uuid(),
      name: 'Bruschetta',
      description: 'Toasted bread with fresh tomatoes, garlic, and basil',
      price: 8,
      category: 'Antipasti',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Caprese Salad',
      description: 'Fresh mozzarella, tomatoes, and basil with olive oil',
      price: 9,
      category: 'Antipasti',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Arancini',
      description: 'Crispy fried risotto balls with mozzarella center',
      price: 7,
      category: 'Antipasti',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    // Pasta
    {
      id: uuid(),
      name: 'Spaghetti Carbonara',
      description: 'Classic Roman pasta with guanciale, egg, and pecorino',
      price: 14,
      category: 'Pasta',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Penne Arrabbiata',
      description: 'Penne in spicy tomato sauce with chili flakes',
      price: 12,
      category: 'Pasta',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Risotto ai Funghi',
      description: 'Creamy Arborio rice with wild mushrooms and Parmesan',
      price: 15,
      category: 'Pasta',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    // Pizza
    {
      id: uuid(),
      name: 'Margherita',
      description: 'Tomato sauce, mozzarella, and fresh basil',
      price: 11,
      category: 'Pizza',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Diavola',
      description: 'Spicy salami, mozzarella, and chili peppers',
      price: 13,
      category: 'Pizza',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Quattro Formaggi',
      description: 'Four cheeses: mozzarella, gorgonzola, fontina, and parmesan',
      price: 14,
      category: 'Pizza',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    // Dolci
    {
      id: uuid(),
      name: 'Tiramisù',
      description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
      price: 8,
      category: 'Dolci',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Panna Cotta',
      description: 'Silky vanilla cream dessert with berry coulis',
      price: 7,
      category: 'Dolci',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Cannolo Siciliano',
      description: 'Crispy pastry shell filled with sweet ricotta and chocolate chips',
      price: 6,
      category: 'Dolci',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    // Drinks
    {
      id: uuid(),
      name: 'Acqua Naturale',
      description: 'Still mineral water',
      price: 3,
      category: 'Drinks',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuid(),
      name: 'Espresso',
      description: 'Traditional Italian espresso',
      price: 2,
      category: 'Drinks',
      imageUrl: '',
      isAvailable: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return { tables, tokens, products };
}
