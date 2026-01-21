import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import { Channel, ChannelType } from '../channels/entities/channel.entity';

dotenvConfig({ path: '.env' });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [Channel],
  logging: true,
});

interface ChannelSeed {
  name: string;
  purpose?: string;
  type: ChannelType;
  children?: ChannelSeed[];
}

const channelSeeds: ChannelSeed[] = [
  {
    name: 'Digital',
    purpose: 'All digital channels for reaching customers online',
    type: ChannelType.OTHER,
    children: [
      {
        name: 'Company Website',
        purpose: 'Main corporate website and landing pages',
        type: ChannelType.WEBSITE,
        children: [
          {
            name: 'Product Pages',
            purpose: 'Detailed product information and specifications',
            type: ChannelType.WEBSITE,
          },
          {
            name: 'Blog',
            purpose: 'Content marketing and thought leadership',
            type: ChannelType.WEBSITE,
          },
        ],
      },
      {
        name: 'Mobile App',
        purpose: 'iOS and Android applications',
        type: ChannelType.MOBILE_APP,
      },
      {
        name: 'Web Application',
        purpose: 'Self-service customer portal',
        type: ChannelType.WEB_APP,
      },
      {
        name: 'Email Marketing',
        purpose: 'Newsletters, promotions, and transactional emails',
        type: ChannelType.EMAIL,
        children: [
          {
            name: 'Newsletter',
            purpose: 'Weekly updates and industry insights',
            type: ChannelType.EMAIL,
          },
          {
            name: 'Promotional Campaigns',
            purpose: 'Sales and special offers',
            type: ChannelType.EMAIL,
          },
        ],
      },
    ],
  },
  {
    name: 'Social Media',
    purpose: 'Social media presence and community engagement',
    type: ChannelType.SOCIAL_MEDIA,
    children: [
      {
        name: 'LinkedIn',
        purpose: 'B2B networking and professional content',
        type: ChannelType.SOCIAL_MEDIA,
      },
      {
        name: 'Twitter/X',
        purpose: 'Real-time updates and customer engagement',
        type: ChannelType.SOCIAL_MEDIA,
      },
      {
        name: 'Instagram',
        purpose: 'Visual storytelling and brand awareness',
        type: ChannelType.SOCIAL_MEDIA,
      },
      {
        name: 'YouTube',
        purpose: 'Video content and tutorials',
        type: ChannelType.SOCIAL_MEDIA,
      },
    ],
  },
  {
    name: 'Paid Advertising',
    purpose: 'Paid acquisition channels',
    type: ChannelType.PAID_ADS,
    children: [
      {
        name: 'Google Ads',
        purpose: 'Search and display advertising',
        type: ChannelType.PAID_ADS,
      },
      {
        name: 'Meta Ads',
        purpose: 'Facebook and Instagram advertising',
        type: ChannelType.PAID_ADS,
      },
      {
        name: 'LinkedIn Ads',
        purpose: 'B2B targeted advertising',
        type: ChannelType.PAID_ADS,
      },
    ],
  },
  {
    name: 'Marketplaces',
    purpose: 'Third-party marketplace presence',
    type: ChannelType.MARKETPLACE,
    children: [
      {
        name: 'Amazon',
        purpose: 'Amazon marketplace storefront',
        type: ChannelType.MARKETPLACE,
      },
      {
        name: 'eBay',
        purpose: 'eBay marketplace listings',
        type: ChannelType.MARKETPLACE,
      },
    ],
  },
  {
    name: 'Direct Sales',
    purpose: 'Direct sales and business development',
    type: ChannelType.FIELD_SALES,
    children: [
      {
        name: 'Enterprise Sales',
        purpose: 'Large account management and enterprise deals',
        type: ChannelType.FIELD_SALES,
      },
      {
        name: 'Inside Sales',
        purpose: 'Remote sales team for SMB segment',
        type: ChannelType.B2B_OUTBOUND,
      },
      {
        name: 'Inbound Sales',
        purpose: 'Handling inbound leads and inquiries',
        type: ChannelType.B2B_INBOUND,
      },
    ],
  },
  {
    name: 'Partners',
    purpose: 'Partner and affiliate channels',
    type: ChannelType.PARTNER,
    children: [
      {
        name: 'Resellers',
        purpose: 'Authorized reseller network',
        type: ChannelType.PARTNER,
      },
      {
        name: 'Affiliates',
        purpose: 'Affiliate marketing program',
        type: ChannelType.PARTNER,
      },
      {
        name: 'Technology Partners',
        purpose: 'Integration and technology partnerships',
        type: ChannelType.PARTNER,
      },
    ],
  },
  {
    name: 'Events',
    purpose: 'In-person and virtual events',
    type: ChannelType.EVENT,
    children: [
      {
        name: 'Trade Shows',
        purpose: 'Industry conferences and exhibitions',
        type: ChannelType.EVENT,
      },
      {
        name: 'Webinars',
        purpose: 'Online educational events',
        type: ChannelType.EVENT,
      },
      {
        name: 'User Conferences',
        purpose: 'Annual customer and community events',
        type: ChannelType.EVENT,
      },
    ],
  },
  {
    name: 'Retail',
    purpose: 'Physical retail presence',
    type: ChannelType.RETAIL_STORE,
    children: [
      {
        name: 'Flagship Stores',
        purpose: 'Premium brand experience locations',
        type: ChannelType.RETAIL_STORE,
      },
      {
        name: 'Pop-up Shops',
        purpose: 'Temporary retail activations',
        type: ChannelType.RETAIL_STORE,
      },
    ],
  },
];

async function createChannelWithChildren(
  repository: any,
  seed: ChannelSeed,
  parent?: Channel
): Promise<Channel> {
  const channel = repository.create({
    name: seed.name,
    purpose: seed.purpose,
    type: seed.type,
  });

  if (parent) {
    channel.parent = parent;
  }

  const savedChannel = await repository.save(channel);

  if (seed.children) {
    for (const childSeed of seed.children) {
      await createChannelWithChildren(repository, childSeed, savedChannel);
    }
  }

  return savedChannel;
}

async function seed() {
  const forceReseed = process.argv.includes('--force') || process.argv.includes('-f');

  console.log('Initializing database connection...');
  await dataSource.initialize();

  const channelRepository = dataSource.getTreeRepository(Channel);

  // Check if channels already exist
  const existingCount = await channelRepository.count();
  if (existingCount > 0) {
    if (forceReseed) {
      console.log(`Clearing ${existingCount} existing channels...`);
      // Delete from closure table first, then channels (leaves first, then parents)
      await dataSource.query('DELETE FROM channel_closure');
      await dataSource.query('DELETE FROM channel');
      console.log('Existing channels cleared.');
    } else {
      console.log(`Database already has ${existingCount} channels. Skipping seed.`);
      console.log('Use --force or -f flag to clear and re-seed.');
      await dataSource.destroy();
      return;
    }
  }

  console.log('Seeding channels...');

  for (const channelSeed of channelSeeds) {
    await createChannelWithChildren(channelRepository, channelSeed);
    console.log(`Created channel tree: ${channelSeed.name}`);
  }

  const totalCount = await channelRepository.count();
  console.log(`Seeding complete! Created ${totalCount} channels.`);

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
