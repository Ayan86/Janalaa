import { db } from './index.ts';
import {
  users,
  genres,
  people,
  contentItems,
  contentGenres,
  contentCastCrew,
  seasons,
  episodes,
  mediaAssets,
  subtitles,
  audioTracks,
  subscriptions,
  auditLogs,
} from './schema.ts';
import { hashPassword } from '../lib/auth.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  try {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log('Database already has users, checking content...');
      const existingContent = await db.select().from(contentItems);
      if (existingContent.length > 0) {
        console.log('Database already seeded.');
        return;
      }
    }

    console.log('Seeding JANALA OTT Database with initial accounts & demo content...');

    // 1. Seed Demo Users
    const defaultPasswordHash = await hashPassword('Janala@2026!');
    const adminPasswordHash = await hashPassword('Admin@Janala2026!');
    const contentPasswordHash = await hashPassword('Content@Janala2026!');
    const financePasswordHash = await hashPassword('Finance@Janala2026!');
    const userPasswordHash = await hashPassword('User@Janala2026!');

    const demoUsers = [
      {
        uid: 'user_admin_001',
        email: 'admin@janala.local',
        passwordHash: adminPasswordHash,
        name: 'Ayan Sit (Admin)',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      {
        uid: 'user_content_001',
        email: 'content@janala.local',
        passwordHash: contentPasswordHash,
        name: 'Tanvir Hossain (Content Lead)',
        role: 'CONTENT_MANAGER',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      {
        uid: 'user_finance_001',
        email: 'finance@janala.local',
        passwordHash: financePasswordHash,
        name: 'Nusrat Jahan (Finance Director)',
        role: 'FINANCE_MANAGER',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
      {
        uid: 'user_regular_001',
        email: 'user@janala.local',
        passwordHash: userPasswordHash,
        name: 'Rahim Chowdhury (Subscriber)',
        role: 'USER',
        status: 'ACTIVE',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      },
    ];

    for (const u of demoUsers) {
      await db.insert(users).values(u).onConflictDoNothing();
    }

    // 2. Seed Genres
    const genreList = [
      { name: 'Action', slug: 'action', description: 'High energy cinematic action and thrill sequences' },
      { name: 'Drama', slug: 'drama', description: 'Compelling emotional narratives and human stories' },
      { name: 'Thriller', slug: 'thriller', description: 'Suspenseful and psychological thrillers' },
      { name: 'Romance', slug: 'romance', description: 'Poetic, soulful romantic films and series' },
      { name: 'Comedy', slug: 'comedy', description: 'Lighthearted entertainment and satire' },
      { name: 'Sci-Fi', slug: 'sci-fi', description: 'Futuristic and speculative speculative fiction' },
      { name: 'Documentary', slug: 'documentary', description: 'Real-world journalism and biographical heritage' },
      { name: 'Short Films', slug: 'short-films', description: 'Artisanal short form cinematic storytelling' },
      { name: 'Animation', slug: 'animation', description: 'Illustrated worlds and family stories' },
      { name: 'Mystery', slug: 'mystery', description: 'Noir investigations and puzzle mysteries' },
    ];

    const insertedGenres: any[] = [];
    for (const g of genreList) {
      const res = await db.insert(genres).values(g).onConflictDoNothing().returning();
      if (res.length > 0) insertedGenres.push(res[0]);
    }
    const allGenres = insertedGenres.length > 0 ? insertedGenres : await db.select().from(genres);

    // 3. Seed 20 Cast/Crew
    const peopleList = [
      { name: 'Chanchal Chowdhury', role: 'ACTOR', biography: 'Acclaimed National Film Award winning actor known for nuanced portrayals.' },
      { name: 'Mosharraf Karim', role: 'ACTOR', biography: 'Iconic versatile actor with over two decades in film and television.' },
      { name: 'Jaya Ahsan', role: 'ACTOR', biography: 'Four-time National Film Award winner in Bangladesh and Filmfare Award East recipient.' },
      { name: 'Afran Nisho', role: 'ACTOR', biography: 'Powerhouse modern leading man known for intense dramatic roles.' },
      { name: 'Mehazabien Chowdhury', role: 'ACTOR', biography: 'Leading OTT star celebrated for emotionally gripping performances.' },
      { name: 'Siam Ahmed', role: 'ACTOR', biography: 'Dynamic action and romantic protagonist of Bangladeshi contemporary cinema.' },
      { name: 'Tasnia Farin', role: 'ACTOR', biography: 'Breakout international sensation celebrated across streaming platforms.' },
      { name: 'Amitabh Reza Chowdhury', role: 'DIRECTOR', biography: 'Visionary auteur director behind groundbreaking contemporary cinema.' },
      { name: 'Giasuddin Selim', role: 'DIRECTOR', biography: 'Award-winning director renowned for folk realism and human drama.' },
      { name: 'Mostofa Sarwar Farooki', role: 'DIRECTOR', biography: 'Internationally recognized filmmaker pioneering the new wave.' },
      { name: 'Ashfaque Nipun', role: 'DIRECTOR', biography: 'Master of socially conscious thrillers and edge-of-the-seat drama.' },
      { name: 'Shubhashish Roy', role: 'PRODUCER', biography: 'Executive producer backing high-budget cinematic productions.' },
      { name: 'Adnan Al Rajeev', role: 'PRODUCER', biography: 'Leading producer transforming digital streaming quality.' },
      { name: 'Kamar Ahmad Simon', role: 'WRITER', biography: 'Cannes-lauded screenwriter and documentary master.' },
      { name: 'Barkat Hossain Polash', role: 'CINEMATOGRAPHER', biography: 'Renowned director of photography crafting iconic lighting palettes.' },
      { name: 'Tahsin Rahman', role: 'CINEMATOGRAPHER', biography: 'Master of anamorphic wide-angle cinematic framing.' },
      { name: 'Pavel Areen', role: 'MUSIC_DIRECTOR', biography: 'Acclaimed composer blending ethnic instruments with orchestral brass.' },
      { name: 'Emon Saha', role: 'MUSIC_DIRECTOR', biography: 'Veteran composer with multiple National Film Awards for best score.' },
      { name: 'Shihab Shaheen', role: 'DIRECTOR', biography: 'Prolific crime drama director crafting binge-worthy series.' },
      { name: 'Bidya Sinha Mim', role: 'ACTOR', biography: 'Celebrated model and leading actress in major commercial blockbusters.' },
    ];

    const insertedPeople: any[] = [];
    for (const p of peopleList) {
      const res = await db.insert(people).values({
        ...p,
        photoUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      }).returning();
      insertedPeople.push(res[0]);
    }

    // 4. Seed 10 Movies
    const moviesData = [
      {
        title: 'The Last Horizon',
        slug: 'the-last-horizon',
        shortDescription: 'A maritime captain fights a cataclysmic cyclone to save an adrift fishing fleet.',
        fullDescription: 'In the treacherous waters of the Bay of Bengal, an aging sea captain must confront ancient grudges and unforgiving weather when a supercyclone cuts off communication with a remote coastal outpost. Featuring breathtaking ocean cinematography.',
        releaseDate: '2025-11-14',
        releaseYear: 2025,
        duration: 138,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-11-14T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Shadows of the Delta',
        slug: 'shadows-of-the-delta',
        shortDescription: 'A gripping detective mystery set against the misty mangrove labyrinth of the Sundarbans.',
        fullDescription: 'When a conservation biologist vanishes without a trace in the deepest reaches of the tidal forest, special investigator Kabir Rahman navigates local legends, dangerous smugglers, and shadowy forest rangers in search of the truth.',
        releaseDate: '2025-08-20',
        releaseYear: 2025,
        duration: 124,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-08-20T08:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Monsoon Symphony',
        slug: 'monsoon-symphony',
        shortDescription: 'An evocative romance spanning two decades through handwritten letters and torrential rains.',
        fullDescription: 'A classical sitar virtuoso and an aspiring poet discover their shared devotion across a flooded riverside town. Through seasonal monsoons and changing worlds, their art becomes an eternal dialogue.',
        releaseDate: '2025-06-12',
        releaseYear: 2025,
        duration: 115,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U',
        accessType: 'FREE',
        isPublished: true,
        publishedAt: new Date('2025-06-12T12:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Midnight in Old Dhaka',
        slug: 'midnight-in-old-dhaka',
        shortDescription: 'A high-octane heist through the narrow bustling alleys of historic Puran Dhaka.',
        fullDescription: 'Three master lockpicks attempt the impossible theft of a priceless Mughal heirloom during the euphoric chaos of the annual Shakrain kite festival.',
        releaseDate: '2025-09-05',
        releaseYear: 2025,
        duration: 142,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-09-05T14:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'The River Queen',
        slug: 'the-river-queen',
        shortDescription: 'A biographical drama celebrating the fearless woman who steered the vintage paddle steamers.',
        fullDescription: 'Chronicles the life of Mayarani, the first female chief pilot on the legendary Rocket paddle steamers crossing the Meghna and Padma rivers in the late 20th century.',
        releaseDate: '2025-04-18',
        releaseYear: 2025,
        duration: 130,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-04-18T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Neon Sylhet',
        slug: 'neon-sylhet',
        shortDescription: 'Cyberpunk tea garden mystery combining biotechnology and ancestral heritage.',
        fullDescription: 'In a near future where tea leaves are engineered for cognitive enhancement, a rogue tea master uncovers a syndicate manipulating agricultural genetics.',
        releaseDate: '2026-01-10',
        releaseYear: 2026,
        duration: 110,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 13+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2026-01-10T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Silent Whispers',
        slug: 'silent-whispers',
        shortDescription: 'A psychological chamber drama following a deaf sculptor in an abandoned seaside villa.',
        fullDescription: 'Isolated on the shores of Cox’s Bazar, an artist discovers bizarre acoustics inside her sculptures that seem to predict future tides.',
        releaseDate: '2025-07-04',
        releaseYear: 2025,
        duration: 98,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: 'FREE',
        isPublished: true,
        publishedAt: new Date('2025-07-04T12:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Frontier Dawn',
        slug: 'frontier-dawn',
        shortDescription: 'A poignant borderland chronicle of two estranged brothers reunited under curfew.',
        fullDescription: 'Along the serpentine border fence, two brothers on opposite sides of the wire must coordinate a life-saving medical delivery through midnight fog.',
        releaseDate: '2025-05-30',
        releaseYear: 2025,
        duration: 122,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 13+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-05-30T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Tapestry of Time',
        slug: 'tapestry-of-time',
        shortDescription: 'A poetic documentary capturing the revival of legendary Dhakai Jamdani weavers.',
        fullDescription: 'A cinematic exploration of traditional weavers along the Shitalakshya River as they recreate historic Jamdani motifs once thought lost to time.',
        releaseDate: '2025-03-22',
        releaseYear: 2025,
        duration: 75,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U',
        accessType: 'FREE',
        isPublished: true,
        publishedAt: new Date('2025-03-22T09:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Eclipse of the Moon',
        slug: 'eclipse-of-the-moon',
        shortDescription: 'Upcoming blockbuster political thriller diving into corporate intrigue and espionage.',
        fullDescription: 'When an orbital telecommunications satellite suddenly falls out of alignment, an independent software auditor uncovers deep political subterfuge.',
        releaseDate: '2026-04-15',
        releaseYear: 2026,
        duration: 135,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2026-04-15T00:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
      },
    ];

    for (let i = 0; i < moviesData.length; i++) {
      const m = moviesData[i];
      const inserted = await db.insert(contentItems).values({
        ...m,
        type: 'MOVIE',
        createdBy: 'admin@janala.local',
      }).returning();
      const content = inserted[0];

      // Associate genres
      const g1 = allGenres[i % allGenres.length];
      const g2 = allGenres[(i + 1) % allGenres.length];
      await db.insert(contentGenres).values([
        { contentId: content.id, genreId: g1.id },
        { contentId: content.id, genreId: g2.id },
      ]);

      // Associate cast/crew
      const actor1 = insertedPeople[i % insertedPeople.length];
      const actor2 = insertedPeople[(i + 2) % insertedPeople.length];
      const director = insertedPeople[(i + 7) % insertedPeople.length];

      await db.insert(contentCastCrew).values([
        { contentId: content.id, personId: actor1.id, role: 'ACTOR', characterName: 'Protagonist' },
        { contentId: content.id, personId: actor2.id, role: 'ACTOR', characterName: 'Antagonist' },
        { contentId: content.id, personId: director.id, role: 'DIRECTOR', characterName: null },
      ]);

      // If uploaded, register mediaAsset record
      if (m.masterVideoStatus === 'UPLOADED') {
        await db.insert(mediaAssets).values({
          contentId: content.id,
          assetType: 'MASTER_VIDEO',
          storageProvider: 'r2',
          storageKey: `janala/movies/${content.id}/master/master-video-${content.slug}.mp4`,
          originalFileName: `${m.slug}-prores-master.mp4`,
          mimeType: 'video/mp4',
          fileSize: String(4820000000 + i * 450000000), // ~4.8GB - 8.5GB
          status: 'UPLOADED',
          etag: `"r2-etag-master-${content.id}-completed"`,
          isCurrent: true,
        });

        // Subtitles (English & Bengali)
        await db.insert(subtitles).values([
          {
            contentId: content.id,
            language: 'Bengali',
            label: 'Bengali (Original)',
            format: 'VTT',
            isDefault: true,
            storageKey: `janala/movies/${content.id}/subtitles/bn/original.vtt`,
          },
          {
            contentId: content.id,
            language: 'English',
            label: 'English (CC)',
            format: 'VTT',
            isDefault: false,
            storageKey: `janala/movies/${content.id}/subtitles/en/subtitles.vtt`,
          },
        ]);

        // Audio Tracks
        await db.insert(audioTracks).values([
          {
            contentId: content.id,
            language: 'Bengali',
            label: 'Bengali 5.1 Surround (Original)',
            codec: 'EAC3',
            isDefault: true,
            storageKey: `janala/movies/${content.id}/audio/bn/surround51.eac3`,
          },
          {
            contentId: content.id,
            language: 'English',
            label: 'English Dubbed Stereo',
            codec: 'AAC',
            isDefault: false,
            storageKey: `janala/movies/${content.id}/audio/en/stereo.aac`,
          },
        ]);
      }
    }

    // 5. Seed Documentaries, Short Films, and TV Series
    const additionalContent = [
      {
        title: 'Voices of the Sundarbans',
        type: 'DOCUMENTARY',
        slug: 'voices-of-the-sundarbans',
        shortDescription: 'An award-winning environmental documentary examining the human-tiger coexistence in Bengal mangrove delta.',
        fullDescription: 'Deep inside the world’s largest mangrove forest, honey collectors and conservationists share stories of survival, climate resilience, and sacred traditions.',
        releaseYear: 2025,
        duration: 82,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U',
        accessType: 'FREE',
        isPublished: true,
        publishedAt: new Date('2025-05-10T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Paper Boat',
        type: 'SHORT_FILM',
        slug: 'paper-boat',
        shortDescription: 'A heartwarming short film following a young boy sailing origami vessels across monsoon puddles in Dhaka.',
        fullDescription: 'In an old alleyway during a sudden summer downpour, a young child and an elderly craftsman discover hope through paper boats carrying secret messages.',
        releaseYear: 2025,
        duration: 24,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U',
        accessType: 'FREE',
        isPublished: true,
        publishedAt: new Date('2025-07-15T08:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80',
      },
      {
        title: 'Epar Opar Express',
        type: 'TV_SERIES',
        slug: 'epar-opar-express',
        shortDescription: 'A popular family drama series highlighting cross-cultural relationships and comedic misunderstandings.',
        fullDescription: 'A multigenerational comedy series following two neighboring families navigating traditions, modern ambitions, and culinary rivalries.',
        releaseYear: 2025,
        duration: 35,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 13+',
        accessType: 'PREMIUM',
        isPublished: true,
        publishedAt: new Date('2025-09-01T10:00:00Z'),
        masterVideoStatus: 'UPLOADED',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
        heroUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80',
      },
    ];

    for (const item of additionalContent) {
      const inserted = await db.insert(contentItems).values({
        ...item,
        createdBy: 'admin@janala.local',
      }).returning();
      const content = inserted[0];

      await db.insert(mediaAssets).values({
        contentId: content.id,
        assetType: 'MASTER_VIDEO',
        storageProvider: 'r2',
        storageKey: `janala/content/${content.id}/master/master-video-${content.slug}.mp4`,
        originalFileName: `${item.slug}-master.mp4`,
        mimeType: 'video/mp4',
        fileSize: String(1200000000),
        status: 'UPLOADED',
        etag: `"r2-etag-${content.id}-completed"`,
        isCurrent: true,
      });

      if (item.type === 'TV_SERIES') {
        const [season] = await db.insert(seasons).values({
          contentId: content.id,
          seasonNumber: 1,
          title: 'Season 1',
          overview: 'Season 1 of Epar Opar Express',
          posterUrl: item.posterUrl,
        }).returning();

        if (season) {
          await db.insert(episodes).values({
            seasonId: season.id,
            episodeNumber: 1,
            title: 'Episode 1: The New Neighbors',
            overview: 'The Journey begins as two families move into adjacent apartments.',
            duration: 35,
            isPublished: true,
            masterVideoStatus: 'UPLOADED',
          });
        }
      }
    }
    const seriesList = [
      {
        title: 'Syndicate: Red Line',
        slug: 'syndicate-red-line',
        shortDescription: 'An elite undercover cybercrime squad tackles financial syndicates across Southeast Asia.',
        fullDescription: 'When millions vanish from the central bank in a coordinated midnight malware injection, Special Agent Fahim leads an unsanctioned task force across Dhaka, Singapore, and Bangkok.',
        releaseYear: 2025,
        accessType: 'PREMIUM',
        posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
        episodesCount: 6,
      },
      {
        title: 'Chittagong Chronicles',
        slug: 'chittagong-chronicles',
        shortDescription: 'Epic historical saga set during the legendary 1930s armory raid resistance.',
        fullDescription: 'Young revolutionaries defy colonial rule in a daring campaign that shook an empire. Combining high-stakes historical drama with emotional intimacy.',
        releaseYear: 2025,
        accessType: 'PREMIUM',
        posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&auto=format&fit=crop&q=80',
        episodesCount: 5,
      },
      {
        title: 'Urban Legends of Bengal',
        slug: 'urban-legends-of-bengal',
        shortDescription: 'Anthology horror series exploring dark folklore alive in modern high-rise apartments.',
        fullDescription: 'From haunted elevator shafts to shadowy reflections along ancient ponds, this chilling anthology examines contemporary anxieties through regional mythology.',
        releaseYear: 2026,
        accessType: 'FREE',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        landscapeUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
        episodesCount: 4,
      },
    ];

    for (const s of seriesList) {
      const insertedSeries = await db.insert(contentItems).values({
        type: 'WEB_SERIES',
        title: s.title,
        slug: s.slug,
        shortDescription: s.shortDescription,
        fullDescription: s.fullDescription,
        releaseYear: s.releaseYear,
        language: 'Bengali',
        country: 'Bangladesh',
        ageRating: 'U/A 16+',
        accessType: s.accessType,
        isPublished: true,
        publishedAt: new Date(),
        posterUrl: s.posterUrl,
        landscapeUrl: s.landscapeUrl,
        masterVideoStatus: 'UPLOADED',
        createdBy: 'admin@janala.local',
      }).returning();
      const seriesItem = insertedSeries[0];

      // Season 1
      const insertedSeason = await db.insert(seasons).values({
        contentId: seriesItem.id,
        seasonNumber: 1,
        title: 'Season 1',
        overview: `The inaugural season of ${s.title}`,
        posterUrl: s.posterUrl,
      }).returning();
      const seasonItem = insertedSeason[0];

      // Episodes
      for (let ep = 1; ep <= s.episodesCount; ep++) {
        const insertedEp = await db.insert(episodes).values({
          seasonId: seasonItem.id,
          episodeNumber: ep,
          title: `Episode ${ep}: ${['The Breach', 'Shadow Trail', 'Silent Signal', 'Midnight Gambit', 'Crossroads', 'Final Reckoning'][ep - 1] || 'Chapter ' + ep}`,
          overview: `Tension escalates as revelations surface in Episode ${ep}.`,
          duration: 45 + ep * 2,
          isPublished: true,
          masterVideoStatus: 'UPLOADED',
        }).returning();

        // Episode Media Asset
        await db.insert(mediaAssets).values({
          episodeId: insertedEp[0].id,
          assetType: 'MASTER_VIDEO',
          storageProvider: 'r2',
          storageKey: `janala/series/${seriesItem.id}/seasons/${seasonItem.id}/episodes/${insertedEp[0].id}/master/ep_${ep}.mp4`,
          originalFileName: `${s.slug}_s01e0${ep}_master.mp4`,
          mimeType: 'video/mp4',
          fileSize: String(1850000000 + ep * 120000000), // ~1.8GB - 2.5GB
          status: 'UPLOADED',
          etag: `"r2-episode-${insertedEp[0].id}"`,
          isCurrent: true,
        });
      }
    }

    // 6. Seed Subscriptions (for Finance Manager & Dashboard Analytics)
    const subscriptionPlans = [
      { email: 'subscriber1@janala.local', plan: 'PREMIUM_ANNUAL', amount: '89.99' },
      { email: 'subscriber2@janala.local', plan: 'PREMIUM_MONTHLY', amount: '9.99' },
      { email: 'subscriber3@janala.local', plan: 'PREMIUM_MONTHLY', amount: '9.99' },
      { email: 'subscriber4@janala.local', plan: 'VIP_FAMILY', amount: '14.99' },
      { email: 'subscriber5@janala.local', plan: 'PREMIUM_ANNUAL', amount: '89.99' },
    ];

    for (const sub of subscriptionPlans) {
      await db.insert(subscriptions).values({
        userId: 'sub_' + Math.random().toString(36).substring(2, 8),
        userEmail: sub.email,
        plan: sub.plan,
        amount: sub.amount,
        currency: 'USD',
        status: 'ACTIVE',
      });
    }

    // 7. Initial Audit Logs
    await db.insert(auditLogs).values([
      {
        userId: 'user_admin_001',
        userEmail: 'admin@janala.local',
        action: 'ADMIN_LOGIN',
        resource: 'AUTH',
        resourceId: 'session_init',
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ note: 'Initial admin portal deployment and security authorization' }),
      },
      {
        userId: 'user_content_001',
        userEmail: 'content@janala.local',
        action: 'MOVIE_CREATED',
        resource: 'MOVIE',
        resourceId: 'the-last-horizon',
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ title: 'The Last Horizon', status: 'DRAFT_CREATED' }),
      },
      {
        userId: 'user_content_001',
        userEmail: 'content@janala.local',
        action: 'UPLOAD_COMPLETED',
        resource: 'MEDIA_ASSET',
        resourceId: 'master-video-the-last-horizon.mp4',
        ipAddress: '127.0.0.1',
        details: JSON.stringify({ size: '5.2 GB', format: 'video/mp4', storage: 'r2' }),
      },
    ]);

    console.log('JANALA OTT Database seeding completed successfully.');
  } catch (err: any) {
    console.warn('Database seed notice (non-fatal):', err.message || err);
  }
}
