import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const hash = (pw: string) => bcrypt.hash(pw, 10);

const PHOTOS = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800",
  "https://images.unsplash.com/photo-1534773728080-33d31da27ae5?w=800",
];

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  await resetDatabase(prisma);

  await prisma.user.create({
    data: { username: "admin", passwordHash: await hash("adminpass123"), role: "ADMIN", displayName: "Administrator" },
  });

  const owners = [
    { username: "ann", displayName: "Ann Stable", email: "ann@example.com", phone: "555-0101" },
    { username: "ben", displayName: "Ben Ranch", email: "ben@example.com", phone: "555-0102" },
    { username: "cara", displayName: "Cara Farm", email: "cara@example.com", phone: "555-0103" },
  ];
  const users = [];
  for (const o of owners) {
    users.push(await prisma.user.create({
      data: { ...o, passwordHash: await hash("password123") },
    }));
  }

  const horsesData = [
    { owner: 0, name: "Duke", sex: "STALLION", breedName: "Thoroughbred", discipline: "RACING", location: "Lexington, KY", lat: 38.04, lng: -84.5, studFee: 8000, color: "Bay", heightHands: 16.1 },
    { owner: 0, name: "Willow", sex: "MARE", breedName: "Warmblood", discipline: "DRESSAGE", location: "Lexington, KY", lat: 38.04, lng: -84.5, color: "Grey", heightHands: 16.0 },
    { owner: 1, name: "Titan", sex: "STALLION", breedName: "Warmblood", discipline: "SHOW_JUMPING", location: "Aiken, SC", lat: 33.56, lng: -81.72, studFee: 6000, color: "Chestnut", heightHands: 16.3 },
    { owner: 1, name: "Sage", sex: "MARE", breedName: "Quarter Horse", discipline: "WESTERN", location: "Aiken, SC", lat: 33.56, lng: -81.72, color: "Palomino", heightHands: 15.0 },
    { owner: 2, name: "Fable", sex: "MARE", breedName: "Arabian", discipline: "TRAIL", location: "Bend, OR", lat: 44.06, lng: -121.31, color: "Black", heightHands: 14.3 },
    { owner: 2, name: "Onyx", sex: "STALLION", breedName: "Friesian", discipline: "DRESSAGE", location: "Bend, OR", lat: 44.06, lng: -121.31, studFee: 5000, color: "Black", heightHands: 16.0 },
  ];

  for (const [i, h] of horsesData.entries()) {
    const horse = await prisma.horse.create({
      data: {
        ownerId: users[h.owner].id,
        name: h.name, sex: h.sex, dob: new Date(`${2008 + (i % 8)}-05-01`),
        breedName: h.breedName, discipline: h.discipline, color: h.color,
        heightHands: h.heightHands, location: h.location, lat: h.lat, lng: h.lng,
        studFee: h.studFee ?? null,
        breedHistory: `${h.breedName} lineage with proven performance lines.`,
        sireName: "Champion Sire", damName: "Proven Dam",
        temperament: "Calm and willing.",
        allergies: i % 2 === 0 ? "None known" : "Sensitive to dust",
        healthIssues: "None known",
        breedingTerms: h.sex === "STALLION" ? "Live foal guarantee." : null,
      },
    });
    await prisma.photo.create({
      data: { horseId: horse.id, path: PHOTOS[i % PHOTOS.length], sortOrder: 0, isPrimary: true },
    });
  }

  const ann = users[0], ben = users[1];
  const annHorse = await prisma.horse.findFirst({ where: { ownerId: ann.id } });
  const benHorse = await prisma.horse.findFirst({ where: { ownerId: ben.id } });
  if (annHorse && benHorse) {
    await prisma.swipe.create({ data: { swiperUserId: ann.id, horseId: benHorse.id, direction: "LIKE" } });
    await prisma.swipe.create({ data: { swiperUserId: ben.id, horseId: annHorse.id, direction: "LIKE" } });
    const [userAId, userBId] = [ann.id, ben.id].sort();
    const match = await prisma.match.create({ data: { userAId, userBId } });
    await prisma.message.create({ data: { matchId: match.id, senderUserId: ann.id, body: "Hi! Interested in a breeding." } });
  }
}
