import type { Locale } from './config'

export type Messages = {
  header: {
    howItWorks: string
    blog: string
    migosAi: string
    pricing: string
    account: string
    signOut: string
    signIn: string
    language: string
  }
  footer: {
    tagline: string
    support: string
    reportContent: string
    migosVideo: string
    blog: string
    pricing: string
    privacy: string
    terms: string
    disclaimer: string
  }
  auth: {
    close: string
    signIn: string
    createAccountTitle: string
    signInDescription: string
    signUpDescription: string
    continueGoogle: string
    or: string
    continueEmail: string
    newHere: string
    email: string
    password: string
    confirmPassword: string
    createAccount: string
    backToOptions: string
    alreadyHaveAccount: string
    passwordsMismatch: string
    confirmEmail: string
  }
  pricing: {
    close: string
    kicker: string
    title: string
    description: string
    noSubscription: string
    freeRetries: string
    refundAfterFailure: string
    recommended: string
    videoLength: string
    oneTime: string
    included: string
    completedVideo: string
    formats: string
    motionSoundtrack: string
    directDownload: string
    createVideo: (resolution: string) => string
    finePrint: string
    existingSubscription: string
    subscriptionsClosed: string
    status: string
    renewalCanceled: string
    resuming: string
    resumePlan: string
    canceling: string
    cancelRenewal: string
    cancelError: string
    resumeError: string
  }
  workbench: {
    addPerformers: string
    addPerformersHelp: string
    leftPerformer: string
    rightPerformer: string
    swapPerformers: string
    sourceHelp: string
    chooseOutput: string
    chooseOutputHelp: string
    seconds: string
    video: string
    templateMotion: string
    soundtrackIncluded: string
    format: string
    formatHelp: string
    vertical: string
    landscape: string
    quality: string
    qualityHelp: string
    recommended: string
    checkingImages: string
    openingCheckout: string
    waitingPayment: string
    checkingPayment: string
    generateFor: (price: string) => string
    emailReady: string
    emailReadyHelp: string
    noSubscription: string
    freeRetries: string
    refundAvailable: string
    safetyPrefix: string
    contentPolicy: string
    reportContent: string
    uploading: string
    popupRequired: string
    imageRejected: string
    unsupportedImage: string
    uploadFailed: string
    moderationUnavailable: string
    errors: {
      promptRejected: string
      safetyUnavailable: string
      imagesNotReady: string
      presetUnavailable: string
      checkoutNotConfigured: string
      checkoutUnavailable: string
      refundUnavailable: string
      refundSupport: string
      paymentSyncing: string
      authRequired: string
      retryFailed: string
      refundFailed: string
      checkoutFailed: string
    }
  }
  results: {
    generatedVideo: string
    newestResult: string
    resultAfterGeneration: string
    history: string
    readyFirst: string
    readyFirstHelp: string
    example: string
    left: string
    right: string
    downloadVideo: string
    refunded: string
    refundRequested: string
    generationFailed: string
    paymentRefunded: string
    refundSubmitted: string
    refundSupportMessage: string
    paidFailureMessage: string
    tryAgain: string
    providerRefundFailed: string
    retrying: string
    retryFree: string
    retry: string
    requesting: string
    requestRefund: string
    contactSupport: string
    generatingVideo: string
    takesMinutes: string
    generationHistory: string
    recentGenerations: (count: number) => string
    closeHistory: string
    playVideo: string
    download: string
    refund: string
    support: string
    generatedPreview: string
    closePreview: string
    soundtrackIncluded: string
    soundtrackUnavailable: string
    soundtrackOff: string
    paid: string
    generating: string
    completed: string
    failed: string
  }
}

const en: Messages = {
  header: {
    howItWorks: 'How it works',
    blog: 'Blog',
    migosAi: 'Migos AI',
    pricing: 'Pricing',
    account: 'Account',
    signOut: 'Sign out',
    signIn: 'Sign in',
    language: 'Language',
  },
  footer: {
    tagline: 'Independent AI video tool for creating hotel-lobby-style motion videos.',
    support: 'Customer support',
    reportContent: 'Report content',
    migosVideo: 'Migos AI Video',
    blog: 'Blog',
    pricing: 'Pricing',
    privacy: 'Privacy',
    terms: 'Terms',
    disclaimer: 'Hotel Lobby AI is an independent tool and is not affiliated with or endorsed by Migos or related rights holders.',
  },
  auth: {
    close: 'Close',
    signIn: 'Sign in',
    createAccountTitle: 'Create your account',
    signInDescription: 'Sign in to continue with generation, billing, and your saved results.',
    signUpDescription: 'Create an account to save results, manage credits, and generate videos.',
    continueGoogle: 'Continue with Google',
    or: 'or',
    continueEmail: 'Continue with Email',
    newHere: 'New here? Create an account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    createAccount: 'Create account',
    backToOptions: 'Back to sign-in options',
    alreadyHaveAccount: 'Already have an account? Sign in',
    passwordsMismatch: 'Passwords do not match.',
    confirmEmail: 'Check your email to confirm your account, then sign in.',
  },
  pricing: {
    close: 'Close pricing',
    kicker: 'Pricing',
    title: 'Pay for one video. No subscription.',
    description: 'Every purchase creates one 15-second Hotel Lobby video at the quality you choose. If a technical generation fails, retry the same paid order for free or request a refund.',
    noSubscription: 'No subscription',
    freeRetries: 'Free retries after failed generations',
    refundAfterFailure: 'Refund request after a failed attempt',
    recommended: 'Recommended',
    videoLength: '15-second video',
    oneTime: 'one-time',
    included: 'Included',
    completedVideo: 'One completed Hotel Lobby video',
    formats: '9:16 Vertical or 16:9 Landscape',
    motionSoundtrack: 'Template motion and soundtrack included',
    directDownload: 'Direct MP4 download after completion',
    createVideo: resolution => `Create ${resolution} video`,
    finePrint: 'A payment covers one successful result for the selected source images, performer positions, format, and quality. Changing those inputs starts a new purchase. Refunds are available after a technical generation failure and are submitted through Waffo.',
    existingSubscription: 'Existing subscription',
    subscriptionsClosed: 'New subscriptions are no longer offered.',
    status: 'Status',
    renewalCanceled: 'Renewal canceled. Contact support if you need help.',
    resuming: 'Resuming…',
    resumePlan: 'Resume existing plan',
    canceling: 'Canceling…',
    cancelRenewal: 'Cancel renewal',
    cancelError: 'Unable to cancel subscription',
    resumeError: 'Unable to resume subscription',
  },
  workbench: {
    addPerformers: 'Add your performers',
    addPerformersHelp: 'Upload one clear photo for each side.',
    leftPerformer: 'Left Performer',
    rightPerformer: 'Right Performer',
    swapPerformers: 'Swap left and right performers',
    sourceHelp: 'One clear person or pet per photo. Keep the face or muzzle visible and use an original, well-lit image.',
    chooseOutput: 'Choose your output',
    chooseOutputHelp: 'Hotel Lobby motion is preset for a consistent result.',
    seconds: '15 sec',
    video: 'video',
    templateMotion: 'Template motion',
    soundtrackIncluded: 'Soundtrack included',
    format: 'Format',
    formatHelp: 'Choose where you plan to post',
    vertical: 'Vertical',
    landscape: 'Landscape',
    quality: 'Quality',
    qualityHelp: 'One-time price per generated video',
    recommended: 'Recommended',
    checkingImages: 'Preparing checkout…',
    openingCheckout: 'Opening secure checkout…',
    waitingPayment: 'Waiting for payment…',
    checkingPayment: 'Checking payment…',
    generateFor: price => `Generate for ${price}`,
    emailReady: 'Email me when it’s ready',
    emailReadyHelp: 'You can close this page after generation starts.',
    noSubscription: 'No subscription',
    freeRetries: 'Free retries if generation fails',
    refundAvailable: 'Refund available after a failed attempt',
    safetyPrefix: 'For human performers, only upload images of adults whose likeness you have permission to use. Pets are supported. NSFW content, minors, deceptive impersonation, and unauthorized likeness use are prohibited.',
    contentPolicy: 'Content policy',
    reportContent: 'Report content',
    uploading: 'Uploading',
    popupRequired: 'Please allow popups so we can open the secure Waffo checkout.',
    imageRejected: 'This image can’t be used. Please choose another image.',
    unsupportedImage: 'Please choose a JPG, PNG, or WebP image.',
    uploadFailed: 'Image upload failed. Please try again.',
    moderationUnavailable: 'We couldn’t verify this image right now. Please try again shortly.',
    errors: {
      promptRejected: 'This request can’t be generated. Please try again with different source photos.',
      safetyUnavailable: 'Safety check is temporarily unavailable. Please try again shortly.',
      imagesNotReady: 'Please choose your two reference images again.',
      presetUnavailable: 'The preset performance is temporarily unavailable. Please try again shortly.',
      checkoutNotConfigured: 'This video quality is not connected to checkout yet.',
      checkoutUnavailable: 'Secure checkout is temporarily unavailable.',
      refundUnavailable: 'A refund is only available after a failed paid generation.',
      refundSupport: 'The previous refund request could not complete. Please contact support for this payment.',
      paymentSyncing: 'Payment confirmation is still syncing. Please try again in a moment.',
      authRequired: 'Please sign in and try again.',
      retryFailed: 'Retry failed',
      refundFailed: 'Refund request failed',
      checkoutFailed: 'Unable to start checkout',
    },
  },
  results: {
    generatedVideo: 'Generated video',
    newestResult: 'Your newest result appears here.',
    resultAfterGeneration: 'Your result will appear here after generation.',
    history: 'History',
    readyFirst: 'Ready for your first generation',
    readyFirstHelp: 'Upload two performers, choose format and quality, and click Generate.',
    example: 'Example',
    left: 'Left',
    right: 'Right',
    downloadVideo: 'Download video',
    refunded: 'Refunded',
    refundRequested: 'Refund requested',
    generationFailed: 'Generation failed',
    paymentRefunded: 'This payment has been refunded.',
    refundSubmitted: 'Your refund request was submitted to Waffo.',
    refundSupportMessage: 'Your payment is still protected. Retry for free, or contact support so we can resolve the failed refund request.',
    paidFailureMessage: 'Your payment is protected. Retry this generation for free, or request a refund.',
    tryAgain: 'Please try again.',
    providerRefundFailed: 'The payment provider could not complete the refund automatically.',
    retrying: 'Retrying…',
    retryFree: 'Retry for free',
    retry: 'Retry',
    requesting: 'Requesting…',
    requestRefund: 'Request refund',
    contactSupport: 'Contact support',
    generatingVideo: 'Generating your video…',
    takesMinutes: 'This usually takes a few minutes.',
    generationHistory: 'Generation history',
    recentGenerations: count => `${count} recent generation${count === 1 ? '' : 's'} · newest first`,
    closeHistory: 'Close history',
    playVideo: 'Play generated video',
    download: 'Download',
    refund: 'Refund',
    support: 'Support',
    generatedPreview: 'Generated video preview',
    closePreview: 'Close video preview',
    soundtrackIncluded: 'Soundtrack included',
    soundtrackUnavailable: 'Soundtrack unavailable',
    soundtrackOff: 'Soundtrack off',
    paid: 'paid',
    generating: 'Generating',
    completed: 'Completed',
    failed: 'Failed',
  },
}

const zhCN: Messages = {
  header: {
    howItWorks: '使用方法',
    blog: '博客',
    migosAi: 'Migos AI',
    pricing: '价格',
    account: '账号',
    signOut: '退出登录',
    signIn: '登录',
    language: '语言',
  },
  footer: {
    tagline: '独立 AI 视频工具，用于生成 Hotel Lobby 风格的双人动态视频。',
    support: '客户支持',
    reportContent: '举报内容',
    migosVideo: 'Migos AI 视频',
    blog: '博客',
    pricing: '价格',
    privacy: '隐私政策',
    terms: '服务条款',
    disclaimer: 'Hotel Lobby AI 是独立工具，与 Migos 或相关权利方不存在隶属、合作或背书关系。',
  },
  auth: {
    close: '关闭',
    signIn: '登录',
    createAccountTitle: '创建账号',
    signInDescription: '登录后可继续生成视频、处理付款并查看已保存的结果。',
    signUpDescription: '创建账号以保存生成结果、管理额度并生成视频。',
    continueGoogle: '使用 Google 继续',
    or: '或',
    continueEmail: '使用邮箱继续',
    newHere: '第一次使用？创建账号',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    createAccount: '创建账号',
    backToOptions: '返回登录方式',
    alreadyHaveAccount: '已有账号？登录',
    passwordsMismatch: '两次输入的密码不一致。',
    confirmEmail: '请前往邮箱确认账号，然后再登录。',
  },
  pricing: {
    close: '关闭价格窗口',
    kicker: '价格',
    title: '按次购买，无需订阅。',
    description: '每次购买可生成一个 15 秒 Hotel Lobby 视频，并按所选清晰度计费。如果发生技术性生成失败，可免费重试同一订单或申请退款。',
    noSubscription: '无需订阅',
    freeRetries: '技术失败后免费重试',
    refundAfterFailure: '失败后可申请退款',
    recommended: '推荐',
    videoLength: '15 秒视频',
    oneTime: '一次性',
    included: '包含',
    completedVideo: '1 个完整 Hotel Lobby 视频',
    formats: '9:16 竖屏或 16:9 横屏',
    motionSoundtrack: '包含模板动作与配乐',
    directDownload: '完成后可直接下载 MP4',
    createVideo: resolution => `生成 ${resolution} 视频`,
    finePrint: '一次付款对应所选素材、人物位置、画面比例和清晰度的一次成功结果。更换这些输入会创建新的购买。技术性生成失败后可申请退款，退款通过 Waffo 提交。',
    existingSubscription: '现有订阅',
    subscriptionsClosed: '目前不再提供新的订阅。',
    status: '状态',
    renewalCanceled: '续费已取消。如需帮助请联系支持。',
    resuming: '正在恢复…',
    resumePlan: '恢复现有套餐',
    canceling: '正在取消…',
    cancelRenewal: '取消续费',
    cancelError: '无法取消订阅',
    resumeError: '无法恢复订阅',
  },
  workbench: {
    addPerformers: '添加人物',
    addPerformersHelp: '左右两侧各上传一张清晰照片。',
    leftPerformer: '左侧人物',
    rightPerformer: '右侧人物',
    swapPerformers: '交换左右人物',
    sourceHelp: '每张图片只保留一个清晰的人物或宠物，确保脸部或口鼻可见，并尽量使用光线良好的原始图片。',
    chooseOutput: '选择输出参数',
    chooseOutputHelp: 'Hotel Lobby 动作已预设，以获得更稳定一致的结果。',
    seconds: '15 秒',
    video: '视频',
    templateMotion: '模板动作',
    soundtrackIncluded: '包含配乐',
    format: '画面比例',
    formatHelp: '根据发布平台选择',
    vertical: '竖屏',
    landscape: '横屏',
    quality: '清晰度',
    qualityHelp: '每个生成视频一次性付费',
    recommended: '推荐',
    checkingImages: '正在准备支付…',
    openingCheckout: '正在打开安全支付…',
    waitingPayment: '等待付款…',
    checkingPayment: '正在确认付款…',
    generateFor: price => `支付 ${price} 生成`,
    emailReady: '完成后邮件通知我',
    emailReadyHelp: '生成开始后可以关闭当前页面。',
    noSubscription: '无需订阅',
    freeRetries: '生成失败可免费重试',
    refundAvailable: '失败后可申请退款',
    safetyPrefix: '如上传真人图片，仅可使用已获授权的成年人肖像。支持宠物。禁止 NSFW、未成年人、欺骗性冒充以及未经授权使用他人肖像。',
    contentPolicy: '内容政策',
    reportContent: '举报内容',
    uploading: '上传中',
    popupRequired: '请允许弹出窗口，以便打开安全的 Waffo 支付页面。',
    imageRejected: '这张图片无法使用，请更换其他图片。',
    unsupportedImage: '请选择 JPG、PNG 或 WebP 图片。',
    uploadFailed: '图片上传失败，请重试。',
    moderationUnavailable: '暂时无法完成图片安全检查，请稍后重试。',
    errors: {
      promptRejected: '当前请求无法生成，请更换素材后重试。',
      safetyUnavailable: '安全检查暂时不可用，请稍后重试。',
      imagesNotReady: '请重新选择两张参考图片。',
      presetUnavailable: '预设动作暂时不可用，请稍后重试。',
      checkoutNotConfigured: '当前清晰度尚未连接支付。',
      checkoutUnavailable: '安全支付暂时不可用。',
      refundUnavailable: '仅技术性失败的已付款生成任务可以退款。',
      refundSupport: '上一次退款请求未能完成，请联系支持处理该笔付款。',
      paymentSyncing: '付款确认仍在同步，请稍后再试。',
      authRequired: '请登录后重试。',
      retryFailed: '重试失败',
      refundFailed: '退款申请失败',
      checkoutFailed: '无法发起支付',
    },
  },
  results: {
    generatedVideo: '生成结果',
    newestResult: '最新生成结果会显示在这里。',
    resultAfterGeneration: '生成完成后，结果会显示在这里。',
    history: '历史记录',
    readyFirst: '可以开始第一次生成',
    readyFirstHelp: '上传两位人物，选择画面比例和清晰度，然后点击生成。',
    example: '示例',
    left: '左侧',
    right: '右侧',
    downloadVideo: '下载视频',
    refunded: '已退款',
    refundRequested: '已申请退款',
    generationFailed: '生成失败',
    paymentRefunded: '这笔付款已退款。',
    refundSubmitted: '退款申请已提交至 Waffo。',
    refundSupportMessage: '你的付款仍受保护。可以免费重试，或联系支持处理未完成的退款申请。',
    paidFailureMessage: '你的付款仍受保护。可以免费重试本次生成，或申请退款。',
    tryAgain: '请重试。',
    providerRefundFailed: '支付服务未能自动完成退款。',
    retrying: '正在重试…',
    retryFree: '免费重试',
    retry: '重试',
    requesting: '正在申请…',
    requestRefund: '申请退款',
    contactSupport: '联系支持',
    generatingVideo: '正在生成视频…',
    takesMinutes: '通常需要几分钟。',
    generationHistory: '生成历史',
    recentGenerations: count => `最近 ${count} 条生成记录 · 最新优先`,
    closeHistory: '关闭历史记录',
    playVideo: '播放生成视频',
    download: '下载',
    refund: '退款',
    support: '支持',
    generatedPreview: '生成视频预览',
    closePreview: '关闭视频预览',
    soundtrackIncluded: '包含配乐',
    soundtrackUnavailable: '配乐不可用',
    soundtrackOff: '未开启配乐',
    paid: '已支付',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  },
}

const ja: Messages = {
  header: {
    howItWorks: '使い方',
    blog: 'ブログ',
    migosAi: 'Migos AI',
    pricing: '料金',
    account: 'アカウント',
    signOut: 'ログアウト',
    signIn: 'ログイン',
    language: '言語',
  },
  footer: {
    tagline: 'Hotel Lobby スタイルのモーション動画を作成する独立系 AI 動画ツールです。',
    support: 'カスタマーサポート',
    reportContent: 'コンテンツを報告',
    migosVideo: 'Migos AI Video',
    blog: 'ブログ',
    pricing: '料金',
    privacy: 'プライバシー',
    terms: '利用規約',
    disclaimer: 'Hotel Lobby AI は独立したツールであり、Migos または関連する権利者との提携・承認関係はありません。',
  },
  auth: {
    close: '閉じる',
    signIn: 'ログイン',
    createAccountTitle: 'アカウントを作成',
    signInDescription: 'ログインすると、動画生成、支払い、保存済み結果の確認を続けられます。',
    signUpDescription: 'アカウントを作成して、生成結果の保存、クレジット管理、動画生成を利用できます。',
    continueGoogle: 'Google で続行',
    or: 'または',
    continueEmail: 'メールで続行',
    newHere: '初めてですか？アカウントを作成',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmPassword: 'パスワードを確認',
    createAccount: 'アカウントを作成',
    backToOptions: 'ログイン方法に戻る',
    alreadyHaveAccount: 'アカウントをお持ちですか？ログイン',
    passwordsMismatch: 'パスワードが一致しません。',
    confirmEmail: '確認メールを開いてアカウントを確認してから、ログインしてください。',
  },
  pricing: {
    close: '料金画面を閉じる',
    kicker: '料金',
    title: '動画ごとの買い切り。サブスクリプション不要。',
    description: '購入ごとに、選択した画質で 15 秒の Hotel Lobby 動画を 1 本生成できます。技術的な生成失敗時は同じ注文を無料で再試行するか、返金を申請できます。',
    noSubscription: 'サブスク不要',
    freeRetries: '生成失敗後は無料再試行',
    refundAfterFailure: '失敗後に返金申請可能',
    recommended: 'おすすめ',
    videoLength: '15 秒動画',
    oneTime: '買い切り',
    included: '含まれるもの',
    completedVideo: '完成した Hotel Lobby 動画 1 本',
    formats: '9:16 縦型または 16:9 横型',
    motionSoundtrack: 'テンプレートモーションと音楽込み',
    directDownload: '完成後に MP4 を直接ダウンロード',
    createVideo: resolution => `${resolution} 動画を作成`,
    finePrint: '1 回の支払いは、選択した素材、左右の配置、比率、画質での 1 回の成功結果に適用されます。入力を変更すると新しい購入になります。技術的な生成失敗後は Waffo 経由で返金を申請できます。',
    existingSubscription: '既存のサブスクリプション',
    subscriptionsClosed: '新規サブスクリプションの提供は終了しています。',
    status: 'ステータス',
    renewalCanceled: '更新はキャンセル済みです。必要な場合はサポートにお問い合わせください。',
    resuming: '再開中…',
    resumePlan: '既存プランを再開',
    canceling: 'キャンセル中…',
    cancelRenewal: '更新をキャンセル',
    cancelError: 'サブスクリプションをキャンセルできませんでした',
    resumeError: 'サブスクリプションを再開できませんでした',
  },
  workbench: {
    addPerformers: '出演者を追加',
    addPerformersHelp: '左右それぞれに鮮明な写真を 1 枚ずつアップロードしてください。',
    leftPerformer: '左の出演者',
    rightPerformer: '右の出演者',
    swapPerformers: '左右の出演者を入れ替える',
    sourceHelp: '1 枚につき人物またはペットを 1 体だけ写し、顔や口元が見える明るいオリジナル画像を使用してください。',
    chooseOutput: '出力を選択',
    chooseOutputHelp: 'Hotel Lobby のモーションは安定した結果のためにあらかじめ設定されています。',
    seconds: '15 秒',
    video: '動画',
    templateMotion: 'テンプレートモーション',
    soundtrackIncluded: '音楽付き',
    format: '比率',
    formatHelp: '投稿先に合わせて選択',
    vertical: '縦型',
    landscape: '横型',
    quality: '画質',
    qualityHelp: '生成動画 1 本ごとの買い切り価格',
    recommended: 'おすすめ',
    checkingImages: '決済を準備中…',
    openingCheckout: '安全な決済画面を開いています…',
    waitingPayment: '支払い待ち…',
    checkingPayment: '支払いを確認中…',
    generateFor: price => `${price} で生成`,
    emailReady: '完成したらメールで通知',
    emailReadyHelp: '生成開始後はこのページを閉じても構いません。',
    noSubscription: 'サブスク不要',
    freeRetries: '生成失敗時は無料再試行',
    refundAvailable: '失敗後は返金申請可能',
    safetyPrefix: '人物画像は、使用許可を得た成人の肖像のみアップロードしてください。ペットにも対応しています。NSFW、未成年者、欺瞞的ななりすまし、無断での肖像利用は禁止されています。',
    contentPolicy: 'コンテンツポリシー',
    reportContent: 'コンテンツを報告',
    uploading: 'アップロード中',
    popupRequired: '安全な Waffo 決済画面を開くため、ポップアップを許可してください。',
    imageRejected: 'この画像は使用できません。別の画像を選択してください。',
    unsupportedImage: 'JPG、PNG、WebP のいずれかを選択してください。',
    uploadFailed: '画像のアップロードに失敗しました。もう一度お試しください。',
    moderationUnavailable: '現在この画像を確認できません。しばらくしてから再試行してください。',
    errors: {
      promptRejected: 'この内容は生成できません。別の素材でお試しください。',
      safetyUnavailable: '安全確認が一時的に利用できません。しばらくしてから再試行してください。',
      imagesNotReady: '2 枚の参照画像を選び直してください。',
      presetUnavailable: 'プリセットモーションが一時的に利用できません。しばらくしてから再試行してください。',
      checkoutNotConfigured: 'この画質はまだ決済に接続されていません。',
      checkoutUnavailable: '安全な決済が一時的に利用できません。',
      refundUnavailable: '返金は、有料生成が技術的に失敗した場合のみ利用できます。',
      refundSupport: '前回の返金処理を完了できませんでした。この支払いについてサポートにお問い合わせください。',
      paymentSyncing: '支払い確認を同期中です。少し待ってから再試行してください。',
      authRequired: 'ログインしてから再試行してください。',
      retryFailed: '再試行に失敗しました',
      refundFailed: '返金申請に失敗しました',
      checkoutFailed: '決済を開始できませんでした',
    },
  },
  results: {
    generatedVideo: '生成動画',
    newestResult: '最新の結果がここに表示されます。',
    resultAfterGeneration: '生成完了後、結果がここに表示されます。',
    history: '履歴',
    readyFirst: '最初の生成を始められます',
    readyFirstHelp: '2 人の出演者をアップロードし、比率と画質を選んで生成してください。',
    example: 'サンプル',
    left: '左',
    right: '右',
    downloadVideo: '動画をダウンロード',
    refunded: '返金済み',
    refundRequested: '返金申請済み',
    generationFailed: '生成に失敗しました',
    paymentRefunded: 'この支払いは返金済みです。',
    refundSubmitted: '返金申請を Waffo に送信しました。',
    refundSupportMessage: '支払いは保護されています。無料で再試行するか、未完了の返金処理についてサポートにお問い合わせください。',
    paidFailureMessage: '支払いは保護されています。この生成を無料で再試行するか、返金を申請できます。',
    tryAgain: 'もう一度お試しください。',
    providerRefundFailed: '決済サービスで返金を自動完了できませんでした。',
    retrying: '再試行中…',
    retryFree: '無料で再試行',
    retry: '再試行',
    requesting: '申請中…',
    requestRefund: '返金を申請',
    contactSupport: 'サポートに連絡',
    generatingVideo: '動画を生成中…',
    takesMinutes: '通常は数分かかります。',
    generationHistory: '生成履歴',
    recentGenerations: count => `最近の生成 ${count} 件 · 新しい順`,
    closeHistory: '履歴を閉じる',
    playVideo: '生成動画を再生',
    download: 'ダウンロード',
    refund: '返金',
    support: 'サポート',
    generatedPreview: '生成動画プレビュー',
    closePreview: '動画プレビューを閉じる',
    soundtrackIncluded: '音楽付き',
    soundtrackUnavailable: '音楽を利用できません',
    soundtrackOff: '音楽なし',
    paid: '支払い済み',
    generating: '生成中',
    completed: '完了',
    failed: '失敗',
  },
}

export const MESSAGES: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
  ja,
}

export function getMessages(locale: Locale) {
  return MESSAGES[locale]
}
