import type { Locale } from './config'

export type LandingPageCopy = {
  seoTitle: string
  seoDescription: string
  eyebrow: string
  title: string
  titleAccent: string
  intro: string
  chips: string[]
  sectionKicker: string
  sectionTitle: string
  sectionIntro: string
  cards: Array<{ title: string; body: string }>
  howKicker: string
  howTitle: string
  howIntro: string
  steps: Array<{ title: string; body: string }>
  tipsKicker: string
  tipsTitle: string
  tipsIntro: string
  tipsPanelTitle: string
  tips: string[]
  guideKicker: string
  guideTitle: string
  guideIntro: string
  guide: Array<{ title: string; body: string }>
  faqTitle: string
  faq: Array<{ q: string; a: string }>
  ctaKicker: string
  ctaTitle: string
  ctaBody: string
  ctaButton: string
}

type LocalizedLandingCopy = {
  home: LandingPageCopy
  migos: LandingPageCopy
}

const zhCN: LocalizedLandingCopy = {
  home: {
    seoTitle: 'Hotel Lobby AI 视频生成器 – 两张照片生成热门双人视频',
    seoDescription: '上传两张照片即可生成 15 秒 Hotel Lobby AI 双人视频。支持交换左右人物、9:16 或 16:9、480p/720p/1080p，并可直接下载 MP4。',
    eyebrow: '热门 AI 视频',
    title: 'Hotel Lobby',
    titleAccent: 'AI 视频生成器',
    intro: '上传两张照片，选择竖屏或横屏以及输出清晰度，即可生成 15 秒 Hotel Lobby AI 双人视频。',
    chips: ['2 张人物照片', '15 秒视频', '9:16 与 16:9'],
    sectionKicker: '可以创作什么',
    sectionTitle: '两位人物，一个专注的 Hotel Lobby 工作流',
    sectionIntro: '上传左侧和右侧人物，需要时一键交换位置，再选择画面比例与清晰度。Hotel Lobby 动作和配乐会自动处理。',
    cards: [
      { title: '朋友与创作者', body: '使用两张清晰照片制作适合社交媒体、合作内容和热门玩法改编的 Hotel Lobby AI 视频。' },
      { title: '宠物与趣味创意', body: '可以尝试宠物或原创角色，同时保持清晰的左右角色关系和双人动作结构。' },
      { title: '穿搭与造型变化', body: '在保持统一动作流程的同时，对比不同服装、人物造型和画面风格。' },
    ],
    howKicker: '使用方法',
    howTitle: '从两张照片到一段双人表演',
    howIntro: '两张照片分别定义左右人物。确认人物位置后，选择画面比例和清晰度，生成器会自动完成 15 秒 Hotel Lobby 表演。',
    steps: [
      { title: '上传两位人物', body: '左侧与右侧各上传一张清晰的人物或宠物照片，尽量保证脸部或口鼻可见。' },
      { title: '确认左右位置和比例', body: '如有需要可交换左右人物，再根据发布平台选择 9:16 竖屏或 16:9 横屏。' },
      { title: '选择清晰度并生成', body: '选择 480p、720p 或 1080p。所有生成固定为 15 秒，并包含模板动作和配乐。' },
    ],
    tipsKicker: '素材越清晰，结果越稳定',
    tipsTitle: '给模型更好的角色参考图',
    tipsIntro: '不需要上传动作参考视频，也无需编写提示词。你只需要提供清晰的左右人物照片。',
    tipsPanelTitle: '推荐的素材图片',
    tips: ['每张图片只保留一个主要人物或宠物。', '确保脸部或口鼻清晰可见且光线充足。', '避免严重模糊、过度裁切和多人遮挡。', '动作涉及全身时，优先使用半身或全身照片。'],
    guideKicker: 'Hotel Lobby AI 指南',
    guideTitle: '怎样获得更稳定的 Hotel Lobby AI 视频',
    guideIntro: '这个工作流把复杂动作配置放在后台处理，让用户只需要专注于人物素材、左右位置、画面比例和清晰度。',
    guide: [
      { title: '什么是 Hotel Lobby AI？', body: 'Hotel Lobby AI 是一种双人 AI 视频形式，可以把两张独立照片组合成一段协调的双人表演。左右人物可以是真人或宠物，动作与节奏由生成器自动完成。' },
      { title: '怎样生成 Hotel Lobby AI 视频？', body: '准备两张清晰照片，分别放到左侧和右侧。如位置不合适可一键交换，然后选择 9:16 或 16:9，以及 480p、720p 或 1080p。' },
      { title: '什么照片效果更好？', body: '避免严重裁脸、强模糊、大面积遮挡和多人重叠。光线良好、人物清楚、服装轮廓完整的照片通常更容易获得稳定结果。' },
      { title: '可以用在哪里？', body: '可以用于短视频、双人互动、宠物视频、穿搭变化、创作者合作以及热门梗改编。保持双人动作结构，替换不同人物和造型即可获得多种变化。' },
    ],
    faqTitle: 'Hotel Lobby AI 常见问题',
    faq: [
      { q: 'Hotel Lobby AI 是什么？', a: '它是一种双人 AI 视频生成方式，把两张人物或宠物照片转换成一段预设动作的 Hotel Lobby 风格视频。' },
      { q: '视频时长是多少？', a: '每次生成固定为 15 秒，以保持动作、节奏与配乐一致。' },
      { q: '可以选择竖屏或横屏吗？', a: '可以。9:16 适合 TikTok、Reels 和 Shorts，16:9 更适合宽屏播放。' },
      { q: '支持宠物吗？', a: '支持。只要每张图都有一个清晰主体并通过安全审核即可。' },
      { q: '需要订阅吗？', a: '不需要。按视频单次付费，不会自动续费。' },
      { q: '生成失败怎么办？', a: '技术性生成失败不会要求再次付款，可以免费重试同一订单，也可以申请退款。' },
      { q: '可以下载视频吗？', a: '可以。完成后可直接播放并下载 MP4。' },
    ],
    ctaKicker: '准备开始？',
    ctaTitle: '制作你自己的 Hotel Lobby AI 视频',
    ctaBody: '上传两位人物，选择画面比例和清晰度，然后从上方生成器开始制作 15 秒视频。',
    ctaButton: '打开生成器 ↑',
  },
  migos: {
    seoTitle: 'Migos AI 视频生成器 – 在线制作 Hotel Lobby AI 视频',
    seoDescription: '上传两张照片生成 15 秒 Migos AI 风格 Hotel Lobby 双人视频。支持交换人物、9:16/16:9 和多档清晰度。',
    eyebrow: 'Migos AI 视频',
    title: 'Migos AI',
    titleAccent: '视频生成器',
    intro: '上传两张照片，将它们转换成 15 秒 Hotel Lobby 风格双人表演。动作与配乐已经预设，无需填写提示词或上传动作参考。',
    chips: ['2 张人物照片', '15 秒视频', '9:16 与 16:9'],
    sectionKicker: 'Migos AI 工作流',
    sectionTitle: '两张照片，一个简单流程',
    sectionIntro: '照片定义人物，你只需要决定左右位置、画面比例和清晰度。Hotel Lobby 动作和配乐会自动处理。',
    cards: [
      { title: '朋友与创作者', body: '适合制作双人社交内容、合作视频和热门玩法改编。' },
      { title: '不同人物组合', body: '可以尝试不同人物、宠物或原创角色，同时保留双人结构。' },
      { title: '不同穿搭', body: '保持动作一致，替换人物造型和服装，快速比较不同视觉效果。' },
    ],
    howKicker: '生成流程',
    howTitle: '上传、设置、生成',
    howIntro: '不需要上传动作参考或编写提示词，只需准备两张清晰照片并选择输出参数。',
    steps: [
      { title: '上传两位人物', body: '左右分别上传一张清晰的人物或宠物照片。清楚的面部细节和良好光线更有利于身份稳定。' },
      { title: '设置位置与画面比例', body: '如有需要可交换左右人物。9:16 适合短视频平台，16:9 适合宽屏播放。' },
      { title: '选择清晰度并生成', body: '选择 480p、720p 或 1080p，生成器会创建固定 15 秒的双人表演。' },
    ],
    tipsKicker: '无需动作设置',
    tipsTitle: 'Hotel Lobby 表演已经预设完成',
    tipsIntro: '无需上传动作参考、编写动作提示词或设置时长。每次生成都会使用预设的 15 秒 Hotel Lobby 动作和配乐。',
    tipsPanelTitle: '素材图片检查清单',
    tips: ['每张图片一个主要主体。', '保证脸部或口鼻可见。', '尽量使用半身或全身照片。', '避免模糊合照和严重遮挡。'],
    guideKicker: 'Migos AI 指南',
    guideTitle: '大家搜索 Migos AI video 时通常指什么？',
    guideIntro: 'Migos AI、Migos AI Video Generator 和 Migos Hotel Lobby AI 等关键词，通常都指向同一类双人酒店大堂风格 AI 视频趋势。',
    guide: [
      { title: '什么是 Migos AI Video Generator？', body: 'Migos AI 常被用于搜索热门的双人 Hotel Lobby 风格 AI 视频。两张照片定义左右人物，AI 视频模型再套用预设动作完成协调表演。' },
      { title: '怎样制作 Migos AI 视频？', body: '左右各上传一张清晰图片，按需交换人物位置，再选择 9:16 或 16:9，以及 480p、720p 或 1080p。' },
      { title: '怎样选择更好的照片？', body: '清晰可见的面部特征通常比黑暗、模糊、重滤镜或严重裁切的照片更稳定。动作涉及身体时，半身或全身照片更合适。' },
      { title: '这是 Migos 官方产品吗？', body: '不是。Hotel Lobby AI 是独立工具，与 Migos 或相关权利方没有隶属、合作或背书关系。' },
    ],
    faqTitle: 'Migos AI 视频常见问题',
    faq: [
      { q: '什么是 Migos AI 视频生成器？', a: 'Migos AI 常用于描述热门的双人 Hotel Lobby 风格 AI 视频。本工具使用两张已获授权的素材照片生成 15 秒双人表演。' },
      { q: '一定要两张照片吗？', a: '是的。左右人物各需要一张清晰照片，生成前可以交换位置。' },
      { q: '需要上传动作视频或填写提示词吗？', a: '不需要。动作与配乐已预设，你只需要选择人物、画面比例和清晰度。' },
      { q: '需要订阅吗？', a: '不需要，按每个生成视频一次性付费。' },
      { q: '生成失败怎么办？', a: '技术性失败可在同一已付款订单上免费重试，也可以申请退款。' },
    ],
    ctaKicker: '准备开始？',
    ctaTitle: '制作你自己的 Hotel Lobby AI 视频',
    ctaBody: '上传两位人物，选择画面比例和清晰度，然后生成固定 15 秒的 Hotel Lobby 双人表演。',
    ctaButton: '打开生成器 ↑',
  },
}

const ja: LocalizedLandingCopy = {
  home: {
    seoTitle: 'Hotel Lobby AI 動画生成 – 2 枚の写真から人気のデュオ動画を作成',
    seoDescription: '2 枚の写真から 15 秒の Hotel Lobby AI 動画を生成。左右の入れ替え、9:16 / 16:9、480p / 720p / 1080p に対応し、MP4 を直接ダウンロードできます。',
    eyebrow: '人気の AI 動画',
    title: 'Hotel Lobby',
    titleAccent: 'AI 動画生成',
    intro: '2 枚の写真をアップロードし、縦型または横型と画質を選ぶだけで、15 秒の Hotel Lobby AI デュオ動画を作成できます。',
    chips: ['出演者の写真 2 枚', '15 秒動画', '9:16 / 16:9'],
    sectionKicker: '作れるもの',
    sectionTitle: '2 人の出演者を、ひとつの Hotel Lobby ワークフローで',
    sectionIntro: '左と右の出演者をアップロードし、必要なら位置を入れ替え、比率と画質を選択します。Hotel Lobby のモーションと音楽は自動で適用されます。',
    cards: [
      { title: '友人・クリエイター', body: '2 枚の鮮明な写真から、SNS 投稿、コラボ、トレンドアレンジ向けの Hotel Lobby AI 動画を作れます。' },
      { title: 'ペット・遊び心のある企画', body: 'ペットやオリジナルの被写体でも、左右が明確な 2 キャラクター構成を維持できます。' },
      { title: 'ファッションのバリエーション', body: '同じモーション構成のまま、服装、人物の雰囲気、見せ方を変えて比較できます。' },
    ],
    howKicker: '使い方',
    howTitle: '2 枚の写真から 1 つのパフォーマンスへ',
    howIntro: '2 枚の写真が左右の出演者を定義します。位置を確認して比率と画質を選ぶと、15 秒の Hotel Lobby パフォーマンスを自動生成します。',
    steps: [
      { title: '出演者を 2 人アップロード', body: '左と右に、それぞれ人物またはペットの鮮明な写真を 1 枚ずつ追加します。顔や口元が見える画像がおすすめです。' },
      { title: '左右と比率を設定', body: '必要なら左右を入れ替え、投稿先に合わせて 9:16 縦型または 16:9 横型を選びます。' },
      { title: '画質を選んで生成', body: '480p、720p、1080p から選択します。動画はすべて 15 秒で、テンプレートモーションと音楽が含まれます。' },
    ],
    tipsKicker: '良い素材ほど安定した結果に',
    tipsTitle: '出演者の参照画像をよりクリアに',
    tipsIntro: 'モーション動画のアップロードやプロンプト入力は不要です。左右の出演者を明確に示す写真を用意することが重要です。',
    tipsPanelTitle: 'おすすめの素材画像',
    tips: ['1 枚につき主役は 1 人または 1 匹にします。', '顔や口元が見え、明るい写真を使用します。', '強いぼけ、極端な切り抜き、複数人の重なりを避けます。', '全身の動きがある場合は、上半身〜全身の写真を使います。'],
    guideKicker: 'Hotel Lobby AI ガイド',
    guideTitle: 'より安定した Hotel Lobby AI 動画を作るには',
    guideIntro: '複雑なモーション設定はサービス側で処理されるため、出演者の素材、左右の配置、比率、画質に集中できます。',
    guide: [
      { title: 'Hotel Lobby AI とは？', body: '別々の 2 枚の写真を 1 つの協調したデュオパフォーマンスに変換する AI 動画形式です。人物だけでなくペットにも対応します。' },
      { title: 'Hotel Lobby AI 動画の作り方', body: '左右に鮮明な写真を 1 枚ずつ追加し、必要なら位置を交換します。次に 9:16 または 16:9 と、480p / 720p / 1080p を選びます。' },
      { title: 'どんな写真が向いている？', body: '顔が見え、明るく鮮明な写真がおすすめです。強いぼけ、極端な切り抜き、複数人が重なる集合写真は避けてください。' },
      { title: 'どんな用途に使える？', body: 'ショート動画、デュオ動画、ペット動画、ファッション比較、クリエイター同士のコラボなどに利用できます。' },
    ],
    faqTitle: 'Hotel Lobby AI よくある質問',
    faq: [
      { q: 'Hotel Lobby AI とは？', a: '2 枚の人物またはペットの写真から、プリセットモーションを使った Hotel Lobby スタイルのデュオ動画を作る AI 動画形式です。' },
      { q: '動画の長さは？', a: 'モーション、テンポ、音楽を一定に保つため 15 秒に固定されています。' },
      { q: '縦型と横型を選べますか？', a: 'はい。9:16 は TikTok、Reels、Shorts 向け、16:9 はワイド表示向けです。' },
      { q: 'ペットにも対応していますか？', a: 'はい。各画像に主な被写体が 1 体写っていて、安全確認を通過すれば利用できます。' },
      { q: 'サブスクリプションは必要ですか？', a: 'いいえ。動画ごとの買い切りで、自動更新はありません。' },
      { q: '生成に失敗した場合は？', a: '技術的な失敗の場合、同じ支払い済み注文を無料で再試行するか、返金を申請できます。' },
      { q: '生成動画をダウンロードできますか？', a: 'はい。完成した動画は MP4 として直接ダウンロードできます。' },
    ],
    ctaKicker: '準備はできましたか？',
    ctaTitle: '自分の Hotel Lobby AI 動画を作る',
    ctaBody: '出演者を 2 人アップロードし、比率と画質を選んで、上の生成ツールから 15 秒動画を作成できます。',
    ctaButton: '生成ツールを開く ↑',
  },
  migos: {
    seoTitle: 'Migos AI 動画生成 – Hotel Lobby AI 動画をオンラインで作成',
    seoDescription: '2 枚の写真から 15 秒の Migos AI スタイル Hotel Lobby 動画を生成。左右入れ替え、9:16 / 16:9、複数画質に対応。',
    eyebrow: 'Migos AI Video',
    title: 'Migos AI',
    titleAccent: '動画生成',
    intro: '2 枚の写真から 15 秒の Hotel Lobby スタイルのデュオパフォーマンスを作成します。モーションと音楽はプリセット済みで、プロンプトや参照動画は不要です。',
    chips: ['出演者の写真 2 枚', '15 秒動画', '9:16 / 16:9'],
    sectionKicker: 'Migos AI ワークフロー',
    sectionTitle: '2 枚の写真、ひとつのシンプルな流れ',
    sectionIntro: '写真が出演者を定義します。左右の位置、比率、画質を選ぶだけで、Hotel Lobby のモーションと音楽は自動処理されます。',
    cards: [
      { title: '友人・クリエイター', body: 'デュオの SNS コンテンツやコラボ、トレンドアレンジに使えます。' },
      { title: 'さまざまな出演者', body: '人物、ペット、オリジナルの被写体を変えながら 2 人構成を維持できます。' },
      { title: 'ファッション違い', body: '同じモーションのまま、服装や出演者の雰囲気を変えて比較できます。' },
    ],
    howKicker: '生成フロー',
    howTitle: 'アップロード、設定、生成',
    howIntro: '参照モーションやプロンプトは不要です。2 枚の鮮明な写真と出力設定だけを用意します。',
    steps: [
      { title: '出演者を 2 人アップロード', body: '左と右に人物またはペットの鮮明な写真を 1 枚ずつ追加します。' },
      { title: '位置と比率を設定', body: '必要なら左右を交換し、ショート動画には 9:16、ワイド表示には 16:9 を選びます。' },
      { title: '画質を選んで生成', body: '480p、720p、1080p から選択すると、固定 15 秒のデュオ動画を生成します。' },
    ],
    tipsKicker: 'モーション設定不要',
    tipsTitle: 'Hotel Lobby のパフォーマンスは設定済み',
    tipsIntro: '参照動画、モーションプロンプト、動画時間の設定は不要です。すべての生成で 15 秒のプリセットモーションと音楽を使用します。',
    tipsPanelTitle: '素材画像チェックリスト',
    tips: ['1 枚につき主な被写体は 1 人または 1 匹。', '顔や口元が見える画像を使用。', '可能なら上半身〜全身の写真を使用。', 'ぼけた集合写真や強い遮蔽を避ける。'],
    guideKicker: 'Migos AI ガイド',
    guideTitle: '「Migos AI video」で検索する人が探しているもの',
    guideIntro: 'Migos AI、Migos AI Video Generator、Migos Hotel Lobby AI などは、多くの場合、同じ 2 人構成の Hotel Lobby スタイル AI 動画を指しています。',
    guide: [
      { title: 'Migos AI Video Generator とは？', body: 'Migos AI は、人気の 2 人構成 Hotel Lobby スタイル動画を探す際によく使われる検索語です。2 枚の写真が左右の出演者を定義し、AI がプリセットモーションを適用します。' },
      { title: 'Migos AI 動画の作り方', body: '左右に写真を追加し、必要なら位置を入れ替え、9:16 または 16:9 と画質を選択します。動画は 15 秒で、モーションと音楽が含まれます。' },
      { title: 'より良い写真を選ぶには', body: '暗い写真、ぼけ、強いフィルター、極端な切り抜きよりも、顔の特徴がはっきり見える写真がおすすめです。' },
      { title: 'Migos 公式サービスですか？', body: 'いいえ。Hotel Lobby AI は独立したツールで、Migos または関連権利者との提携・承認関係はありません。' },
    ],
    faqTitle: 'Migos AI 動画 よくある質問',
    faq: [
      { q: 'Migos AI 動画生成とは？', a: 'Migos AI は、人気の 2 人構成 Hotel Lobby スタイル AI 動画を指す検索語として使われています。' },
      { q: '写真は 2 枚必要ですか？', a: 'はい。左と右の出演者に 1 枚ずつ必要で、生成前に位置を入れ替えられます。' },
      { q: 'モーション動画やプロンプトは必要ですか？', a: '不要です。モーションと音楽はプリセット済みです。' },
      { q: 'サブスクリプションは必要ですか？', a: '不要です。生成動画ごとの買い切りです。' },
      { q: '生成に失敗した場合は？', a: '技術的な失敗は同じ支払い済み注文で無料再試行でき、返金も申請できます。' },
    ],
    ctaKicker: '準備はできましたか？',
    ctaTitle: '自分の Hotel Lobby AI 動画を作る',
    ctaBody: '出演者を 2 人アップロードし、比率と画質を選んで、15 秒の Hotel Lobby パフォーマンスを作成します。',
    ctaButton: '生成ツールを開く ↑',
  },
}

export function getLocalizedLandingCopy(locale: Locale): LocalizedLandingCopy {
  return locale === 'ja' ? ja : zhCN
}
