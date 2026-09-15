import fs from 'fs';

// Read data files
const humanGuidesContent = fs.readFileSync('src/data/human-guides.ts', 'utf8');
const curatedReviewsContent = fs.readFileSync('src/data/curated-reviews.ts', 'utf8');

console.log('=====================================================');
console.log('     TRAVEZY - COMPREHENSIVE PHOTO AUDIT SUITE      ');
console.log('=====================================================\n');

// 1. Audit Human Tour Guides Photos
const guideMatches = [];
const guideRegex = /id:\s*"(guide-[^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?profile_image:\s*"([^"]+)"/g;
let m;
while ((m = guideRegex.exec(humanGuidesContent)) !== null) {
  guideMatches.push({ id: m[1], name: m[2], photo: m[3] });
}

console.log(`[TEST 1] Human Tour Guides Photo Audit (${guideMatches.length} guides)`);
const guidePhotoMap = new Map();
const guideDuplicateCollisions = [];

guideMatches.forEach((g) => {
  const photoId = g.photo.split('?')[0];
  if (guidePhotoMap.has(photoId)) {
    guideDuplicateCollisions.push({
      guide: g.id,
      name: g.name,
      photo: photoId,
      duplicateWith: guidePhotoMap.get(photoId)
    });
  } else {
    guidePhotoMap.set(photoId, g);
  }
});

if (guideDuplicateCollisions.length === 0 && guideMatches.length === 28) {
  console.log(`✅ PASS: All ${guideMatches.length} tour guides have 100% unique photos!`);
} else {
  console.error(`❌ FAIL: Found ${guideDuplicateCollisions.length} duplicate guide photo collisions!`, guideDuplicateCollisions);
}

// 2. Audit Curated Reviews Photos
console.log(`\n[TEST 2] Curated Reviews Avatar Audit`);
const reviewMatches = [];
const reviewRegex = /id:\s*"(cr-[^"]+)"[\s\S]*?reviewer_name:\s*"([^"]+)"[\s\S]*?reviewer_avatar:\s*"([^"]+)"/g;
while ((m = reviewRegex.exec(curatedReviewsContent)) !== null) {
  reviewMatches.push({ id: m[1], name: m[2], avatar: m[3] });
}

console.log(`Parsed ${reviewMatches.length} static curated reviews with avatars.`);
const reviewPhotoMap = new Map();
const reviewCollisions = [];
const guideCollisionsWithReviewers = [];

reviewMatches.forEach((r) => {
  const photoId = r.avatar.split('?')[0];
  if (guidePhotoMap.has(photoId)) {
    guideCollisionsWithReviewers.push({
      reviewId: r.id,
      reviewerName: r.name,
      photo: photoId,
      guideCollision: guidePhotoMap.get(photoId).name
    });
  }
  if (reviewPhotoMap.has(photoId)) {
    reviewCollisions.push({
      reviewId: r.id,
      reviewerName: r.name,
      photo: photoId,
      duplicateWith: reviewPhotoMap.get(photoId)
    });
  } else {
    reviewPhotoMap.set(photoId, r);
  }
});

if (guideCollisionsWithReviewers.length === 0) {
  console.log(`✅ PASS: Zero reviewer avatars collide with tour guide photos!`);
} else {
  console.error(`❌ FAIL: Reviewer avatars collide with tour guides:`, guideCollisionsWithReviewers);
}

if (reviewCollisions.length === 0 && reviewMatches.length === 18) {
  console.log(`✅ PASS: All ${reviewMatches.length} static curated reviews have 100% unique avatars!`);
} else {
  console.error(`❌ FAIL: Found duplicate review avatars:`, reviewCollisions);
}

// 3. Audit Reviewer Persona Pool
console.log(`\n[TEST 3] Reviewer Persona Pool Audit`);
const poolRegex = /REVIEWER_PERSONA_POOL:\s*\{[^}]+\}\[\]\s*=\s*\[([\s\S]*?)\];/;
const poolMatch = curatedReviewsContent.match(poolRegex);
let poolCount = 0;
let poolCollisionsWithGuides = 0;
const poolPhotoSet = new Set();
let poolDuplicates = 0;

if (poolMatch) {
  const avatarItemRegex = /avatar:\s*"([^"]+)"/g;
  let am;
  while ((am = avatarItemRegex.exec(poolMatch[1])) !== null) {
    poolCount++;
    const photoId = am[1].split('?')[0];
    if (guidePhotoMap.has(photoId)) {
      poolCollisionsWithGuides++;
    }
    if (poolPhotoSet.has(photoId)) {
      poolDuplicates++;
    }
    poolPhotoSet.add(photoId);
  }
}

console.log(`Pool personas parsed: ${poolCount}, Unique pool photos: ${poolPhotoSet.size}`);
if (poolCollisionsWithGuides === 0 && poolDuplicates === 0 && poolCount >= 30) {
  console.log(`✅ PASS: Reviewer pool has ${poolCount} unique photos with 0 collisions against guides!`);
} else {
  console.error(`❌ FAIL: Pool collisions: ${poolCollisionsWithGuides} with guides, ${poolDuplicates} internal duplicates.`);
}

// 4. Audit Guide Reviews in human-guides.ts
console.log(`\n[TEST 4] Guide Reviews in human-guides.ts Audit`);
const guideRevRegex = /id:\s*"(rev-g-\d+)",\s*reviewer_name:\s*"([^"]+)",\s*reviewer_avatar:\s*"([^"]+)"/g;
let guideRevCount = 0;
let guideRevCollisionsWithGuides = 0;
while ((m = guideRevRegex.exec(humanGuidesContent)) !== null) {
  guideRevCount++;
  const photoId = m[3].split('?')[0];
  if (guidePhotoMap.has(photoId)) {
    guideRevCollisionsWithGuides++;
  }
}

console.log(`Guide reviews parsed with avatar: ${guideRevCount}`);
if (guideRevCount > 0 && guideRevCollisionsWithGuides === 0) {
  console.log(`✅ PASS: All ${guideRevCount} guide reviews have valid avatars with 0 collisions against guides!`);
} else {
  console.error(`❌ FAIL: Guide reviews collisions with guides: ${guideRevCollisionsWithGuides}`);
}

console.log('\n=====================================================');
console.log('              ALL AUDITS COMPLETE                   ');
console.log('=====================================================');
