const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
let serviceAccount;
try {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
} catch(e) {
    serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const dummyProfiles = [
    {
        uid: 'dummy_1',
        email: 'sara.ahmed@example.com',
        phoneNumber: '+923001234567',
        displayName: 'Sara Ahmed',
        gender: 'Female',
        dateOfBirth: Timestamp.fromDate(new Date('1995-04-15')),
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        isVerified: true,
        profileCompleted: true,
        photosApproved: true,
        compatibilityCompleted: true,
        verificationStatus: 'approved',
        completionPercentage: 100,
        otpVerified: true,
        role: 'user',
        profession: 'Software Engineer',
        heightCm: 165,
        permanentCity: 'Lahore',
        permanentCountry: 'Pakistan',
        currentCity: 'Lahore',
        currentCountry: 'Pakistan',
        educationLevel: 'Bachelors',
        discipline: 'Computer Science',
        maritalStatus: 'Never Married',
        marriageIntention: 'Within 1 year',
        religiosity: 'Practicing',
        sect: 'Sunni',
        ethnicity: 'Punjabi',
        caste: 'Arain',
        smokingPreference: 'Never',
        alcoholConsumption: false,
        prays5Times: true,
        interests: ['Technology', 'Reading', 'Travel'],
        hobbies: ['Photography', 'Cooking'],
        bio: 'I am a software engineer who loves to travel and read. Looking for someone with similar interests.',
        isDormant: false,
        isPaused: false,
    },
    {
        uid: 'dummy_2',
        email: 'ali.khan@example.com',
        phoneNumber: '+923007654321',
        displayName: 'Ali Khan',
        gender: 'Male',
        dateOfBirth: Timestamp.fromDate(new Date('1993-08-22')),
        profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        isVerified: true,
        profileCompleted: true,
        photosApproved: true,
        compatibilityCompleted: true,
        verificationStatus: 'approved',
        completionPercentage: 100,
        otpVerified: true,
        role: 'user',
        profession: 'Doctor',
        heightCm: 180,
        permanentCity: 'Karachi',
        permanentCountry: 'Pakistan',
        currentCity: 'Islamabad',
        currentCountry: 'Pakistan',
        educationLevel: 'Masters',
        discipline: 'Medicine',
        maritalStatus: 'Never Married',
        marriageIntention: 'Within 1 year',
        religiosity: 'Practicing',
        sect: 'Sunni',
        ethnicity: 'Pathan',
        caste: 'Khan',
        smokingPreference: 'Never',
        alcoholConsumption: false,
        prays5Times: true,
        interests: ['Fitness', 'Sports', 'Volunteering'],
        hobbies: ['Cricket', 'Gym'],
        bio: 'A passionate doctor dedicated to my profession. Seeking a partner who is understanding and supportive.',
        isDormant: false,
        isPaused: false,
    },
    {
        uid: 'dummy_3',
        email: 'fatima.bilal@example.com',
        phoneNumber: '+923001112222',
        displayName: 'Fatima Bilal',
        gender: 'Female',
        dateOfBirth: Timestamp.fromDate(new Date('1997-11-05')),
        profileImage: 'https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?auto=format&fit=crop&q=80&w=400',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        isVerified: true,
        profileCompleted: true,
        photosApproved: true,
        compatibilityCompleted: true,
        verificationStatus: 'approved',
        completionPercentage: 100,
        otpVerified: true,
        role: 'user',
        profession: 'Teacher',
        heightCm: 160,
        permanentCity: 'Islamabad',
        permanentCountry: 'Pakistan',
        currentCity: 'Islamabad',
        currentCountry: 'Pakistan',
        educationLevel: 'Bachelors',
        discipline: 'Education',
        maritalStatus: 'Never Married',
        marriageIntention: 'Within 2 years',
        religiosity: 'Moderately Practicing',
        sect: 'Sunni',
        ethnicity: 'Sindhi',
        caste: 'Baloch',
        smokingPreference: 'Never',
        alcoholConsumption: false,
        prays5Times: false,
        interests: ['Art', 'History', 'Movies'],
        hobbies: ['Painting', 'Baking'],
        bio: 'I teach primary school students. I enjoy a balanced life between Deen and Duniya.',
        isDormant: false,
        isPaused: false,
    },
    {
        uid: 'dummy_4',
        email: 'usman.tariq@example.com',
        phoneNumber: '+923003334444',
        displayName: 'Usman Tariq',
        gender: 'Male',
        dateOfBirth: Timestamp.fromDate(new Date('1990-02-18')),
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        isVerified: true,
        profileCompleted: true,
        photosApproved: true,
        compatibilityCompleted: true,
        verificationStatus: 'approved',
        completionPercentage: 100,
        otpVerified: true,
        role: 'user',
        profession: 'Business Owner',
        heightCm: 175,
        permanentCity: 'Faisalabad',
        permanentCountry: 'Pakistan',
        currentCity: 'Lahore',
        currentCountry: 'Pakistan',
        educationLevel: 'Masters',
        discipline: 'Business Administration',
        maritalStatus: 'Divorced',
        marriageIntention: 'As soon as possible',
        religiosity: 'Practicing',
        sect: 'Shia',
        ethnicity: 'Punjabi',
        caste: 'Rajput',
        smokingPreference: 'Occasionally',
        alcoholConsumption: false,
        prays5Times: true,
        interests: ['Entrepreneurship', 'Politics', 'Cars'],
        hobbies: ['Driving', 'Dining out'],
        bio: 'Looking for a fresh start with someone who values family and honesty.',
        isDormant: false,
        isPaused: false,
    },
    {
        uid: 'dummy_5',
        email: 'zainab.shah@example.com',
        phoneNumber: '+923005556666',
        displayName: 'Zainab Shah',
        gender: 'Female',
        dateOfBirth: Timestamp.fromDate(new Date('1999-07-30')),
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        isVerified: true,
        profileCompleted: true,
        photosApproved: true,
        compatibilityCompleted: true,
        verificationStatus: 'approved',
        completionPercentage: 100,
        otpVerified: true,
        role: 'user',
        profession: 'Graphic Designer',
        heightCm: 168,
        permanentCity: 'Peshawar',
        permanentCountry: 'Pakistan',
        currentCity: 'Lahore',
        currentCountry: 'Pakistan',
        educationLevel: 'Bachelors',
        discipline: 'Design',
        maritalStatus: 'Never Married',
        marriageIntention: 'Within 2 years',
        religiosity: 'Moderately Practicing',
        sect: 'Sunni',
        ethnicity: 'Pathan',
        caste: 'Syed',
        smokingPreference: 'Never',
        alcoholConsumption: false,
        prays5Times: true,
        interests: ['Design', 'Music', 'Fashion'],
        hobbies: ['Sketching', 'Photography'],
        bio: 'Creative individual looking for a supportive and open-minded partner to share life with.',
        isDormant: false,
        isPaused: false,
    }
];

async function seedProfiles() {
    try {
        console.log('Seeding dummy profiles...');
        
        const batch = db.batch();
        const usersRef = db.collection('users');

        for (const profile of dummyProfiles) {
            const docRef = usersRef.doc(profile.uid);
            batch.set(docRef, profile);
            // Initialize discover_feed_cache for the dummies so they are fully valid?
            // Wait, we just need them in users collection.
        }

        await batch.commit();
        console.log('Successfully seeded 5 dummy profiles!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding profiles:', error);
        process.exit(1);
    }
}

seedProfiles();
