// Sample Product Model (static data for now)
const products = [
    { name: 'Astro Chronograph', price: 2000, originalPrice: 4000, image: '/images/watch1.jpg' },
    { name: 'Citizen', price: 4400, originalPrice: 6000, image: '/images/watch2.jpg' },
    { name: 'Emporio Armani', price: 5000, originalPrice: 7000, image: '/images/watch3.jpg' },
    { name: 'Rizer', price: 1200, originalPrice: 2000, image: '/images/watch4.jpg' },
    { name: 'Maurice de Mauriac', price: 2000, originalPrice: 4000, image: '/images/watch5.jpg' },
    { name: 'Aston Eimmel', price: 6000, originalPrice: 8000, image: '/images/watch6.jpg' },
    { name: 'Kryme Mill', price: 1400, originalPrice: 3000, image: '/images/watch7.jpg' },
    { name: 'Michael Kors', price: 3000, originalPrice: 5000, image: '/images/watch8.jpg' },
    { name: 'Sapphire', price: 2200, originalPrice: 3500, image: '/images/watch9.jpg' },
];

// Function to get all products (simulating a database query)
const getAllProducts = () => {
    return products;
};

module.exports = { getAllProducts };