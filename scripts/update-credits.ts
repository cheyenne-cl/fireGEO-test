import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const AUTUMN_API_URL = 'https://api.useautumn.com/v1';
const AUTUMN_SECRET_KEY = process.env.AUTUMN_SECRET_KEY;

if (!AUTUMN_SECRET_KEY || AUTUMN_SECRET_KEY === 'your_autumn_secret_key_here') {
  console.log('❌ Autumn billing integration not configured.');
  console.log('   To enable Autumn:');
  console.log('   1. Sign up at https://useautumn.com');
  console.log('   2. Add your AUTUMN_SECRET_KEY to .env.local');
  console.log('   3. Run: npm run setup:autumn\n');
  process.exit(1);
}

async function updateUserCredits(userId: string, credits: number) {
  try {
    console.log(`🔄 Updating credits for user ${userId} to ${credits}...`);
    
    // First, check if the user exists and get current balance
    const checkResponse = await fetch(`${AUTUMN_API_URL}/customers/${userId}/features/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTUMN_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      console.log(`❌ User ${userId} not found or error checking current balance`);
      return;
    }

    const currentData = await checkResponse.json();
    console.log(`📊 Current balance: ${currentData.data?.balance || 0} credits`);

    // Update the user's credits by setting the balance
    const updateResponse = await fetch(`${AUTUMN_API_URL}/customers/${userId}/features/messages`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AUTUMN_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        balance: credits,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`API error: ${updateResponse.status} - ${error}`);
    }

    const result = await updateResponse.json();
    console.log(`✅ Successfully updated credits to ${credits}`);
    console.log(`📊 New balance: ${result.data?.balance || credits} credits`);
    
    return result;
  } catch (error) {
    console.error('❌ Error updating credits:', error);
    throw error;
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
const credits = parseInt(process.argv[3]) || 100;

if (!userId) {
  console.log('❌ Please provide a user ID');
  console.log('Usage: npx tsx scripts/update-credits.ts <userId> [credits]');
  console.log('Example: npx tsx scripts/update-credits.ts user_123 100');
  process.exit(1);
}

// Update the user's credits
updateUserCredits(userId, credits).catch(error => {
  console.error('\n❌ Failed to update credits:', error);
  process.exit(1);
}); 