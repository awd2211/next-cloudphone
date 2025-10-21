import { DataSource } from 'typeorm';
import { Application, AppCategory, AppStatus } from '../entities/application.entity';

export async function seedApps(dataSource: DataSource) {
  const appRepository = dataSource.getRepository(Application);

  console.log('🌱 Seeding applications...');

  const apps = [
    {
      name: 'Chrome浏览器',
      packageName: 'com.android.chrome',
      versionName: '119.0.6045.163',
      versionCode: 604516300,
      category: AppCategory.TOOL,
      status: AppStatus.AVAILABLE,
      description: 'Google Chrome 浏览器官方版本',
      icon: 'https://lh3.googleusercontent.com/KwUBNPbMTk9jDXYS2AeX3illtVRTkrKVh5xR1Mg4WHd0CG2tV4mrh1z3kXi5z_warlk',
      size: 145678901,
      minSdkVersion: 24,
      targetSdkVersion: 33,
      bucketName: 'apps',
      objectKey: 'com.android.chrome_119.0.6045.163.apk',
      permissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
      downloadCount: 0,
      metadata: {
        publisher: 'Google LLC',
        lastUpdated: new Date().toISOString(),
      },
    },
    {
      name: '微信',
      packageName: 'com.tencent.mm',
      versionName: '8.0.40',
      versionCode: 2380,
      category: AppCategory.SOCIAL,
      status: AppStatus.AVAILABLE,
      description: '微信，是一个生活方式',
      icon: 'https://example.com/wechat.png',
      size: 234567890,
      minSdkVersion: 21,
      targetSdkVersion: 31,
      bucketName: 'apps',
      objectKey: 'com.tencent.mm_8.0.40.apk',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_CONTACTS',
      ],
      downloadCount: 0,
      metadata: {
        publisher: 'Tencent',
        lastUpdated: new Date().toISOString(),
      },
    },
    {
      name: '抖音',
      packageName: 'com.ss.android.ugc.aweme',
      versionName: '28.0.0',
      versionCode: 280000,
      category: AppCategory.ENTERTAINMENT,
      status: AppStatus.AVAILABLE,
      description: '记录美好生活',
      icon: 'https://example.com/douyin.png',
      size: 189012345,
      minSdkVersion: 21,
      targetSdkVersion: 33,
      bucketName: 'apps',
      objectKey: 'com.ss.android.ugc.aweme_28.0.0.apk',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      downloadCount: 0,
      metadata: {
        publisher: 'ByteDance',
        lastUpdated: new Date().toISOString(),
      },
    },
    {
      name: '淘宝',
      packageName: 'com.taobao.taobao',
      versionName: '10.25.10',
      versionCode: 468,
      category: AppCategory.BUSINESS,
      status: AppStatus.AVAILABLE,
      description: '淘宝 - 太好逛了吧',
      icon: 'https://example.com/taobao.png',
      size: 167890123,
      minSdkVersion: 21,
      targetSdkVersion: 31,
      bucketName: 'apps',
      objectKey: 'com.taobao.taobao_10.25.10.apk',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      downloadCount: 0,
      metadata: {
        publisher: 'Alibaba',
        lastUpdated: new Date().toISOString(),
      },
    },
    {
      name: 'Android测试工具',
      packageName: 'com.test.automation',
      versionName: '1.0.0',
      versionCode: 100,
      category: AppCategory.TOOL,
      status: AppStatus.AVAILABLE,
      description: '自动化测试工具',
      icon: 'https://example.com/test.png',
      size: 12345678,
      minSdkVersion: 21,
      targetSdkVersion: 33,
      bucketName: 'apps',
      objectKey: 'com.test.automation_1.0.0.apk',
      permissions: ['android.permission.INTERNET'],
      downloadCount: 0,
      metadata: {
        publisher: 'CloudPhone Team',
        lastUpdated: new Date().toISOString(),
        testing: true,
      },
    },
  ];

  const createdApps = [];
  for (const appData of apps) {
    const existing = await appRepository.findOne({ where: { packageName: appData.packageName } });
    if (!existing) {
      const app = appRepository.create(appData);
      createdApps.push(await appRepository.save(app));
    } else {
      createdApps.push(existing);
    }
  }
  console.log(`✅ Created ${createdApps.length} applications`);

  console.log('\n🎉 Application seed data completed!');
  return { apps: createdApps };
}
