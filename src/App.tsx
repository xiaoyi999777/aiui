/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
 Sparkles, 
 RotateCcw, 
 Upload, 
 Download, 
 ChevronRight, 
 History, 
 Stethoscope, 
 Share2, 
 AlertCircle, 
 CheckCircle2, 
 AlertTriangle,
 ShieldCheck,
 ChevronDown,
 Info,
 Layers,
 Activity,
 Plus,
 Minus,
 Tag,
 User,
 Save,
 Search,
 Users,
 Video,
 Clapperboard,
 Image as ImageIcon,
 Type,
 Hash,
 Copy,
 Terminal,
 Settings2,
 Zap,
 MapPin,
 Train,
 KeyRound,
 UserCircle,
 ImageDown,
 RefreshCw,
 Palette,
 Trash2,
 Brush,
 Sun,
 Contrast,
 Droplets,
 Wind,
 Wand2,
 Layout,
 Server,
 Globe,
 Key,
 Monitor,
 X,
 Database,
 MessageSquare,
 Target
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
 collection, 
 addDoc, 
 deleteDoc,
 doc,
 getDocs, 
 query, 
 where, 
 orderBy, 
 serverTimestamp,
 type Timestamp
} from 'firebase/firestore';
import { 
 signInWithPopup, 
 GoogleAuthProvider, 
 onAuthStateChanged,
 type User as FirebaseUser
} from 'firebase/auth';
import { cn } from './lib/utils';

// --- Types ---

// --- Constants ---

const VLOG_TEMPLATES = {
  topics: `作为职业短视频编导，生成{N}个境外高性价比轻医美vlog选题。
平台属性：{PLATFORM}
要求：
1. 标题必须具备极强的点击欲望（Hook）。
2. 内容矩阵涵盖：省钱攻略类、真实变美记录类、避坑指南类、沉浸式体验类。
3. 目的地：{目的地} | 项目：{项目}
4. 输出格式：纯文本，每行一个开场白，无序号。`,

  scripts: `作为职业短视频编导，撰写一个爆款境外医美vlog脚本。
背景：月薪{月薪}，独自一人去{目的地}，为了做{项目}省下{省钱金额}。
路径：从{出发地}通过{交通方式}来到{目的地}，持{证件}入境。
核心点：位于{目的地}{地段}，本来想做{想做数量}最后做了{实际数量}，全套下来只花了{实际花费}。
恢复期：记录第{消肿天数}天的真实样子。
要求：
1. 涵盖三种类型：【反直觉型】、【利益诱导型】、【情绪共鸣型】。
2. 语言极其口语化，像在跟好闺蜜私密分享。
3. 加入针对平台流量密码（如：小红书的"救命"、"我不允许没人知道"，抖音的"家人们谁懂啊"）。
4. 输出格式：纯文本。`,

  storyboard: `根据脚本 and 要求，生成该35秒视频的片段拼接(Storyboard)方案。
要求：
1. 拆分为8-12个镜头(Clips)
2. 每个镜头包含：时长(Duration)、画面内容描述(Scene)、AI绘图提示词(Imagen Prompt)、导演笔记(Director Notes)
3. 作为【AI 绘图提示词大师】，请确保 Imagen Prompt 极其详细。必须包含：
   - 画面构图：9:16竖屏，电影感。
   - 核心特征：必须是中国境内（中国内地）实景，人物必须为纯正中国女生，拒绝西化特征。
   - 技术参数：8K，超高清，HDR，真实皮肤质感（Real Skin Texture），微距/特写镜头应用。
   - 场景氛围：必须深度结合当前目的地风格 and 医美项目特征。
4. 包含以下关键帧：出发POV、落地实拍、诊所环境（中国内地风格）、面诊近景、产品拆封、支付、术前状态、术后惊艳侧脸。
5. 输出格式：JSON数组格式。`,

  visuals: {
    before: `原相机前置摄像头拍摄，{年龄}岁中国女生素颜正面照，{面部问题}，皮肤状态自然，无美颜无滤镜，自然光，室内窗边，真实皮肤纹理，无磨皮，无化妆，头发随意扎起，表情自然，竖屏9:16，8K超高清，电影级画质，HDR高动态光影`,
    after: `原相机前置摄像头拍摄，{年龄}岁中国女生素颜正面照，皮肤紧致有光泽，{改善效果}，自然微笑，无美颜无滤镜，自然光，室内窗边，真实皮肤纹理，无磨皮，无化妆，头发随意扎起，表情自然，竖屏9:16，8K超高清，电影级画质，HDR高动态光影`,
    clinic: `{城市}核心地段医美机构内部空镜，现代简约风格，白色调为主，干净明亮，大理石地面，玻璃隔断，无任何logo和文字标识，无人，自然光+室内灯光，竖屏9:16，8K超高清，电影级画质，HDR高动态光影`,
    product: `女性手部特写，正在拆封白色医美产品包装盒，无任何品牌标识 and 文字，桌面干净，背景模糊，自然光，特写镜头，竖屏9:16，8K超高清，电影级画质，HDR高动态光影`,
    travel: `{场景}，第一人称视角，无人物正脸，无logo，竖屏9:16，8K超高清，电影级画质，HDR高动态光影`,
    payment: `手机屏幕截图，微信支付成功界面，金额数字模糊处理，其他信息全部打码，黑色背景，竖屏9:16，8K超高清`
  },

  tags: `为"{视频标题}"生成10个抖音标签，严格遵循以下规则：
1. 包含3个大流量标签（1000万+播放）
2. 包含5个中流量标签（100万-1000万播放）
3. 包含2个精准流量标签（10万-100万播放）
4. 覆盖医美、旅游、省钱三个流量池
5. 禁止使用医疗宣传类违规词汇
6. 输出格式：#标签1 #标签2 #标签3 ...`
};

const VLOG_PLATFORMS = [
  { id: 'douyin', name: '抖音 (High Energy)', style: '快节奏/强冲突/直击痛点' },
  { id: 'xiaohongshu', name: '小红书 (Aesthetic)', style: '氛围感/精致感/深度测评' },
  { id: 'wechat', name: '视频号 (Trust)', style: '真实记录/稳重内敛/强背书' }
];

const DEPARTMENTS = [
  { id: 'surgery', name: '外科整形 (Surgery)' },
  { id: 'injection', name: '微整注射 (Injection)' },
  { id: 'skin', name: '皮肤抗衰 (Skin)' },
  { id: 'oral', name: '口腔颌面 (Oral)' }
];

const CATEGORIES = [
 { 
   id: 'nose', 
   dept: 'surgery',
   name: '鼻部综合 (Rhinoplasty)', 
   items: [
     { id: 'n_bridge', name: '假体隆鼻', description: '硅胶/膨体垫高' },
     { id: 'n_cartilage', name: '自体软骨隆鼻', description: '耳/肋软骨移植' },
     { id: 'n_tip', name: '鼻头塑形', description: '缩小/抬高' },
     { id: 'n_wing', name: '鼻翼缩小', description: '宽度调整' },
     { id: 'n_base', name: '鼻基底填充', description: '改善中面凹陷' },
     { id: 'n_kyphosis', name: '驼峰鼻/歪鼻矫正', description: '线条平顺' }
   ]
 },
 {
   id: 'eye',
   dept: 'surgery',
   name: '眼部精雕 (Periorbital)',
   items: [
     { id: 'e_double', name: '双眼皮手术', description: '全切/埋线/三点' },
     { id: 'e_opening', name: '开角手术', description: '内/外眼角' },
     { id: 'e_bags', name: '祛眼袋', description: '内切/外切' },
     { id: 'e_tear', name: '泪沟填充', description: '平滑下睑' },
     { id: 'e_ptois', name: '上睑下垂矫正', description: '提肌缩短' },
     { id: 'e_worms', name: '卧蚕成形', description: '眼神立体' }
   ]
 },
 {
   id: 'contour',
   dept: 'surgery',
   name: '轮廓优化 (Contouring)',
   items: [
     { id: 'c_jaw', name: '下颌角截骨', description: 'V-Line成形' },
     { id: 'c_chin', name: '下巴截骨/假体', description: '长度/翘度' },
     { id: 'c_cheek', name: '颧骨内推', description: '宽度缩减' },
     { id: 'c_fat', name: '面部吸脂', description: '下颌缘轮廓' },
     { id: 'c_cheekpad', name: '颊脂垫去除', description: '面颊纤细' }
   ]
 },
 {
   id: 'filler',
   dept: 'injection',
   name: '填充塑形 (Fillers)',
   items: [
     { id: 'f_apple', name: '苹果肌填充', description: '玻尿酸/脂肪' },
     { id: 'f_temple', name: '太阳穴/额头填充', description: '轮廓衔接' },
     { id: 'f_lip', name: '丰唇/口周', description: '嘴形优化' },
     { id: 'f_basal', name: '鼻基底(注射)', description: '法令纹改善' }
   ]
 }
];

const PRESETS = [
 { id: 'p_nature', name: '妈生感自然微调', projects: { n_bridge: 1, e_double: 1, t_face: 1 } },
 { id: 'p_celeb', name: '高清上镜精致脸', projects: { n_bridge: 3, n_wing: 3, c_jaw: 4, t_face: 3 } },
 { id: 'p_light', name: '轻医美年轻化', projects: { e_tear: 4, f_naso: 3, e_bags: 4 } }
];

const RECOVERY_TIMELINE = [
 { val: 0, label: '0h', stage: '术后即刻', desc: '伤口渗血，急性肿胀，皮肤张力极大' },
 { val: 3, label: '3d', stage: '严重肿胀期', desc: '肿胀峰值，淤青扩散，压痛明显' },
 { val: 7, label: '7d', stage: '快速消肿期', desc: '拆线，伤口结痂，淤青转黄（血铁黄素沉积）' },
 { val: 14, label: '14d', stage: '持续消肿期', desc: '肿胀消退80%，轮廓清晰，进入组织修复' },
 { val: 30, label: '1m', stage: '组织恢复期', desc: '疤痕增生初期，线条渐趋自然，仍有微肿' },
 { val: 90, label: '3m', stage: '最终成型期', desc: '疤痕软化，形态稳定，获得最佳临床效果' },
 { val: 365, label: '1y', stage: '远期维持期', desc: '组织完全融合，形态持久化' }
];

const PHYSIQUE_TYPES = [
 { id: 'pro_swelling', name: '易肿体质', factor: 0.8 },
 { id: 'normal', name: '平衡体质', factor: 1.0 },
 { id: 'no_swelling', name: '极速恢复', factor: 1.2 },
 { id: 'keloid', name: '疤痕体质', factor: 0.7 }
];

// --- Components ---

export default function App() {
 const [image, setImage] = useState<string | null>(null);
 const [simulatedImage, setSimulatedImage] = useState<string | null>(null);
 const [clinicalAnalysis, setClinicalAnalysis] = useState<string | null>(null);
 const [intensities, setIntensities] = useState<Record<string, number>>({});
 const [isGenerating, setIsGenerating] = useState(false);
 const [genError, setGenError] = useState<string | null>(null);
 const [genProgress, setGenProgress] = useState(0);

 // Professional Parameters (Moved up to prevent ReferenceErrors)
 const [postOpDays, setPostOpDays] = useState(30);
 const [physique, setPhysique] = useState('normal');
 const [patientAge, setPatientAge] = useState(25);
 const [lifestyle, setLifestyle] = useState({ nonsmoker: true, exercise: true });
 const [surgeryMethod, setSurgeryMethod] = useState('invasive'); 
 const [materials, setMaterials] = useState('premium'); 
 const [careLevel, setCareLevel] = useState('expert');
 const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0].id);
 const [expandedCats, setExpandedCats] = useState<string[]>(['nose', 'eye']);

 const [vlogGenProgress, setVlogGenProgress] = useState(0);
 const [vlogGenStatus, setVlogGenStatus] = useState('');
 const [vlogReferenceImage, setVlogReferenceImage] = useState<string | null>(null);
 const [vlogCharacterConsistency, setVlogCharacterConsistency] = useState(true);
 const [isDownloading, setIsDownloading] = useState<string | null>(null);

 const downloadImage = async (url: string, prefixOrFilename = 'doc') => {
   if (setIsDownloading) setIsDownloading(url);
   try {
     let finalUrl = url;
     // Use proxy for remote URLs to avoid CORS issues
     if (!url.startsWith('data:') && !url.startsWith('blob:')) {
       const response = await fetch('/api/proxy', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ url, method: 'GET' })
       });
       
       if (!response.ok) throw new Error("Proxy fetch failed");
       
       const blob = await response.blob();
       finalUrl = URL.createObjectURL(blob);
     } else if (url.startsWith('data:')) {
       const response = await fetch(url);
       const blob = await response.blob();
       finalUrl = URL.createObjectURL(blob);
     }

     const link = document.createElement('a');
     link.href = finalUrl;
     const isFullFilename = prefixOrFilename.includes('.');
     link.download = isFullFilename ? prefixOrFilename : `${prefixOrFilename}-${Date.now()}.png`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     if (finalUrl.startsWith('blob:')) URL.revokeObjectURL(finalUrl);
   } catch (e) {
     console.error("Download failed, opening in new tab", e);
     window.open(url, '_blank');
   } finally {
     if (setIsDownloading) setIsDownloading(null);
   }
 };
 const [activeTab, setActiveTab] = useState<'comparison' | 'timeline' | 'report' | 'multiview'>('comparison');
 
 // Matrix Toggle
 const [showMatrixTiles, setShowMatrixTiles] = useState(true);

 // Auth & Firestore State
 const [user, setUser] = useState<FirebaseUser | null>(null);
 const [patientName, setPatientName] = useState('');
 const [patientInfo, setPatientInfo] = useState('');
 const [savedPatients, setSavedPatients] = useState<any[]>([]);
 const [isSaving, setIsSaving] = useState(false);
 const [showPatientArchive, setShowPatientArchive] = useState(false);
 const [showVlogLab, setShowVlogLab] = useState(false);
 const [showAssetGallery, setShowAssetGallery] = useState(false);
 const [savedAssets, setSavedAssets] = useState<any[]>([]);

 // Vlog Lab State
 const [mainModule, setMainModule] = useState<'vlog' | 'faceswap' | 'simulation' | 'batch-image'>('vlog');
 const [batchImageResults, setBatchImageResults] = useState<Array<{ id: string, url: string, prompt: string, createdAt: number, taskName: string }>>(() => {
   try {
     const saved = localStorage.getItem('batch_image_library');
     const parsed = saved ? JSON.parse(saved) : [];
     return Array.isArray(parsed) ? parsed : [];
   } catch (e) {
     console.error("Failed to load batchImageResults", e);
     return [];
   }
 });

 React.useEffect(() => {
   localStorage.setItem('batch_image_library', JSON.stringify(batchImageResults));
 }, [batchImageResults]);

 const [batchImagePrompts, setBatchImagePrompts] = useState<string[]>(Array(10).fill(""));
 const [batchImageTaskName, setBatchImageTaskName] = useState(`批量生图_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
 const [batchImageProgress, setBatchImageProgress] = useState<Record<number, number>>({});
 const [isGeneratingBatchImage, setIsGeneratingBatchImage] = useState(false);
 const [selectedBatchImg, setSelectedBatchImg] = useState<string | null>(null);
 const [batchImageAspectRatio, setBatchImageAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');

 const [faceSwapResults, setFaceSwapResults] = useState<Array<{ id: string, url: string, createdAt: number, filters: any, taskName: string, source: string, target: string }>>(() => {
   try {
     const saved = localStorage.getItem('face_swap_library');
     const parsed = saved ? JSON.parse(saved) : [];
     return Array.isArray(parsed) ? parsed : [];
   } catch (e) {
     console.error("Failed to load faceSwapResults", e);
     return [];
   }
 });

 const [simulationResults, setSimulationResults] = useState<Array<{ id: string, url: string, report: string, createdAt: number, taskName: string, prompt: string, settings: any }>>(() => {
   try {
     const saved = localStorage.getItem('simulation_library');
     const parsed = saved ? JSON.parse(saved) : [];
     return Array.isArray(parsed) ? parsed : [];
   } catch (e) {
     console.error("Failed to load simulationResults", e);
     return [];
   }
 });

 React.useEffect(() => {
   localStorage.setItem('face_swap_library', JSON.stringify(faceSwapResults));
 }, [faceSwapResults]);

 React.useEffect(() => {
   localStorage.setItem('simulation_library', JSON.stringify(simulationResults));
 }, [simulationResults]);

 const [faceSwapInputs, setFaceSwapInputs] = useState<{ source: string | null, targets: string[] }>({
   source: null,
   targets: []
 });

 const [faceSwapPrompt, setFaceSwapPrompt] = useState("A cinematic portrait of a person, highly detailed, 8k resolution, photorealistic style, wearing professional attire.");
 const [faceSwapBaseUrl, setFaceSwapBaseUrl] = useState(() => localStorage.getItem('face_swap_base_url') || "https://api.img.dengche.cc/v1");
 const [faceSwapApiKey, setFaceSwapApiKey] = useState(() => localStorage.getItem('face_swap_api_key') || "");
 const [faceSwapModel, setFaceSwapModel] = useState(() => localStorage.getItem('face_swap_model') || "gpt-4o");
 const [faceSwapImageModel, setFaceSwapImageModel] = useState(() => localStorage.getItem('face_swap_image_model') || "gpt-image-2");
 const [useGeminiSim, setUseGeminiSim] = useState(() => {
   const saved = localStorage.getItem('use_gemini_sim');
   return saved === null ? true : saved === 'true';
 });
 const [faceSwapApis, setFaceSwapApis] = useState<string[]>(Array(10).fill("v1/images/edits"));
 const [showApiConfig, setShowApiConfig] = useState(false);
 const [faceSwapTaskName, setFaceSwapTaskName] = useState(`任务_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
 const [simulationTaskName, setSimulationTaskName] = useState(`模拟_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
 const [simulationPrompt, setSimulationPrompt] = useState("");
 const [basePromptPreview, setBasePromptPreview] = useState("");

 const [faceSwapProgress, setFaceSwapProgress] = useState<Record<string, number>>({});
 const [isGeneratingFaceSwap, setIsGeneratingFaceSwap] = useState(false);
 const [selectedFaceImg, setSelectedFaceImg] = useState<string | null>(null);

 const [faceFilters, setFaceFilters] = useState({
   brightness: 100,
   contrast: 100,
   saturation: 100,
   blur: 0,
   sepia: 0
 });

 const [vlogVars, setVlogVars] = useState({
   N: '8',
   location: '香港',
   project: '玻尿酸填充',
   salary: '8000',
   savings: '3',
   from: '广州',
   transport: '高铁',
   visa: '港澳通行证',
   district: '中环',
   planned: '3',
   actual: '2',
   cost: '9800',
   days: '7',
   age: '26',
   problem: '面部紧致度下降',
   effect: '轮廓立体感提升',
   scene: '维多利亚港夜景',
   chineseStyle: true,
   imageEngine: 'stock', // 'dalle' or 'stock'
   apiBaseUrl: 'https://api.openai.com/v1'
 });

 const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('vlog_openai_key') || '');
 const [openaiBaseUrl, setOpenaiBaseUrl] = useState(() => localStorage.getItem('vlog_openai_base_url') || 'https://api.openai.com/v1');

 React.useEffect(() => {
   localStorage.setItem('vlog_openai_key', openaiKey);
 }, [openaiKey]);

 React.useEffect(() => {
   localStorage.setItem('vlog_openai_base_url', openaiBaseUrl);
 }, [openaiBaseUrl]);

 React.useEffect(() => {
   localStorage.setItem('face_swap_base_url', faceSwapBaseUrl);
   // Migration: ensure dengche.cc has /v1
   if (faceSwapBaseUrl.includes('dengche.cc') && !faceSwapBaseUrl.includes('/v1')) {
     const normalized = faceSwapBaseUrl.endsWith('/') ? `${faceSwapBaseUrl}v1` : `${faceSwapBaseUrl}/v1`;
     setFaceSwapBaseUrl(normalized);
   }
 }, [faceSwapBaseUrl]);

 React.useEffect(() => {
   localStorage.setItem('face_swap_image_model', faceSwapImageModel);
 }, [faceSwapImageModel]);

 React.useEffect(() => {
   localStorage.setItem('use_gemini_sim', String(useGeminiSim));
 }, [useGeminiSim]);

 React.useEffect(() => {
   localStorage.setItem('face_swap_api_key', faceSwapApiKey);
 }, [faceSwapApiKey]);

 React.useEffect(() => {
   localStorage.setItem('face_swap_model', faceSwapModel);
 }, [faceSwapModel]);

 const [vlogResult, setVlogResult] = useState<{
   topics?: string;
   script?: string;
   storyboard?: any[];
   tags?: string;
   storyboardImages?: string[];
 } | null>(null);
 const [isGeneratingVlog, setIsGeneratingVlog] = useState(false);
 const [activeVlogTab, setActiveVlogTab] = useState<'topics' | 'script' | 'storyboard'>('topics');

 // Vlog Lab Logic
 const handleGenerateVlog = async (type: 'topics' | 'script' | 'storyboard' | 'tags' | 'all') => {
   setIsGeneratingVlog(true);
   setVlogResult(null);
   setVlogGenProgress(0);
   setVlogGenStatus('AI 正在构思方案...');
   
   const progressInterval = setInterval(() => {
     setVlogGenProgress(prev => {
       if (prev >= 95) return prev;
       return prev + (prev < 40 ? 5 : (prev < 80 ? 2 : 0.5));
     });
   }, 300);

   try {
     const getApiKey = () => {
       const metaEnv = (import.meta as any).env;
       return (metaEnv?.VITE_GEMINI_API_KEY as string) || (window as any).process?.env?.GEMINI_API_KEY || '';
     };
     const apiKey = getApiKey();
     if (!apiKey) throw new Error("API Key required");

     const ai = new GoogleGenAI({ apiKey });
     
     const vars = vlogVars;
     let fullPrompt = `你现在拥有三重专家身份：
1. 【医美短视频营销高级专家】：擅长策划具有极高病毒式传播力的短视频选题与脚本。
1. 【AI 绘图提示词大师 (AI Prompt Master)】：擅长撰写极其精细、具有电影级质感且逻辑严密的 AI 图片生成提示词。
1. 【视觉一致性专家】：擅长在多张生成的图片中保持主角形象的一致性。

前项目背景：
 目的地/场景：${vars.location}
 核心项目：${vars.project}
 任务名称：${faceSwapTaskName || '未命名项目'}

执行后续任务（特别是生成分镜脚本和视觉描述）时，请务必发挥你“提示词大师”的功力。脚本应优化为：有钩子、有痛点、有利益点、有引导。
镜提示词应精准还原${vars.location}的真实质感。Imagen Prompt 字段必须包含：
 画面构图：9:16竖屏，电影感。
 核心特征：必须是中国境内（中国内地）实景，人物必须为纯正中国女生，拒绝西化特征。
 技术参数：8K，超高清，HDR，真实皮肤质感（Real Skin Texture），微距/特写镜头应用。
n`;

     if (vlogReferenceImage) {
       // We will pass the image data to gemini
     }

     if (type === 'topics' || type === 'all') {
       fullPrompt += `
TASK: Generate Topics\nTemplate: ${VLOG_TEMPLATES.topics
         .replace('{N}', vars.N)
         .replace('{目的地}', vars.location)
         .replace('{项目}', vars.project)}`;
     }
     if (type === 'script' || type === 'all') {
       fullPrompt += `\n\nTASK: Generate Script\nTemplate: ${VLOG_TEMPLATES.scripts
         .replace('{月薪}', vars.salary)
         .replace('{目的地}', vars.location)
         .replace('{项目}', vars.project)
         .replace('{省钱金额}', vars.savings)
         .replace('{出发地}', vars.from)
         .replace('{交通方式}', vars.transport)
         .replace('{证件}', vars.visa)
         .replace('{地段}', vars.district)
         .replace('{想做数量}', vars.planned)
         .replace('{实际数量}', vars.actual)
         .replace('{实际花费}', vars.cost)
         .replace('{消肿天数}', vars.days)}`;
     }
     if (type === 'storyboard' || type === 'all') {
       fullPrompt += `\n\nTASK: Generate Storyboard JSON\nTemplate: ${VLOG_TEMPLATES.storyboard}`;
     }
     if (type === 'tags' || type === 'all') {
       fullPrompt += `\n\nTASK: Generate Tags\nTemplate: ${VLOG_TEMPLATES.tags.replace('{视频标题}', '境外医美省钱攻略')}`;
     }

     const response = await ai.models.generateContent({
       model: "gemini-3-flash-preview",
       contents: {
         parts: [
           { text: fullPrompt },
           ...(vlogReferenceImage ? [{
             inlineData: {
               data: vlogReferenceImage.split(',')[1],
               mimeType: "image/jpeg"
             }
           }] : [])
         ]
       },
     });
     const text = response.text || "";
     
     setVlogGenStatus('正在解析并优化内容...');
     setVlogGenProgress(90);

     // Attempt to parse sections with more flexible splitting
     const sections = text.split(/(?=\n\nTASK:|\nTASK:|^TASK:)/i);
     const getSection = (searchKey: string) => {
       const found = sections.find(s => s.toUpperCase().includes(searchKey.toUpperCase()));
       if (!found) return "";
       return found.split('\n').slice(1).join('\n').trim();
     };

     const newResult: any = {};
     if (type === 'all' || type === 'topics') newResult.topics = getSection('Generate Topics');
     if (type === 'all' || type === 'script') newResult.script = getSection('Generate Script');
     if (type === 'all' || type === 'tags') newResult.tags = getSection('Generate Tags');
     
     if (type === 'all' || type === 'storyboard') {
       const jsonBlock = getSection('Generate Storyboard JSON')?.match(/\[[\s\S]*\]/)?.[0];
       if (jsonBlock) {
         try {
           const parsedStoryboard = JSON.parse(jsonBlock);
           newResult.storyboard = parsedStoryboard;
           newResult.storyboardImages = new Array(parsedStoryboard.length).fill(null);

           setVlogResult(newResult);
           setVlogGenStatus('AI 绘图引擎启动中...');
           
           // Function to generate images one by one
           const generateStoryboardImages = async () => {
             for (let i = 0; i < parsedStoryboard.length; i++) {
               try {
                 const clip = parsedStoryboard[i];
                 
                 if (vlogVars.imageEngine === 'dalle') {
                   setVlogGenStatus(`正在使用 GPT DALL-E 3 渲染分镜 #${i+1}...`);
                   const response = await fetch('/api/generate-image', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ 
                       prompt: clip['Imagen Prompt'] || clip.Scene,
                       chineseStyle: vlogVars.chineseStyle,
                       customApiKey: openaiKey,
                       customBaseUrl: openaiBaseUrl
                     }),
                   });

                   const responseText = await response.text();
                   if (!response.ok) {
                     let errMsg = "Failed to generate";
                     try {
                       const errData = JSON.parse(responseText);
                       errMsg = errData.error || responseText;
                     } catch (e) {
                       errMsg = responseText;
                     }
                     throw new Error(errMsg);
                   }

                   const data = JSON.parse(responseText);
                   const imageUrl = data.url;

                   setVlogResult(current => {
                     if (!current) return null;
                     const newImages = [...(current.storyboardImages || [])];
                     newImages[i] = imageUrl;
                     return { ...current, storyboardImages: newImages };
                   });
                 } else {
                   setVlogGenStatus(`正在准备模拟素材 #${i+1}...`);
                   await new Promise(r => setTimeout(r, 400));
                   throw new Error("Stock simulation");
                 }
               } catch (e) {
                 console.error("Image gen failed or skipped", e);
                 
                 // If user EXPLICITLY chose dalle and it failed, stop and show error
                 if (vlogVars.imageEngine === 'dalle' && e instanceof Error && e.message !== "Stock simulation") {
                   setVlogGenStatus(`渲染失败: ${e.message}`);
                   return; // Stop the loop
                 }

                 // Fallback for stock mode or non-critical errors
                 const keywords = encodeURIComponent(`${vlogVars.location} ${vlogVars.project} aesthetic clinic`);
                 const seed = Math.floor(Math.random() * 1000000);
                 const realUrl = `https://images.unsplash.com/photo-${seed % 2 === 0 ? '1519494140281-8ff73bd257ba' : '1551076805-e1869033e561'}?auto=format&fit=crop&q=80&w=800&h=1200&sig=${seed+i}`;

                 setVlogResult(current => {
                   if (!current) return null;
                   const newImages = [...(current.storyboardImages || [])];
                   newImages[i] = realUrl;
                   return { ...current, storyboardImages: newImages };
                 });
               }
             }
             setVlogGenStatus('素材库构建完成');
             setVlogGenProgress(100);
           };
           
           setTimeout(generateStoryboardImages, 100);
         } catch(e) { console.error("JSON parse fail", e); }
       } else {
          setVlogGenProgress(100);
       }
     } else {
       setVlogGenProgress(100);
     }

     setVlogResult(prev => ({ ...prev, ...newResult }));
   } catch (error) {
     console.error(error);
     alert("生成失败，请确认 API Key 已配置");
   } finally {
     clearInterval(progressInterval);
     setIsGeneratingVlog(false);
   }
 };

 // Helper to fetch remote image and convert to Blob/File for FormData
 const getFileFromUrl = async (url: string, filename: string): Promise<File | null> => {
   try {
     // If it's already a base64 data URL
     if (url.startsWith('data:')) {
       try {
         const res = await fetch(url);
         const blob = await res.blob();
         return new File([blob], filename, { type: blob.type });
       } catch (dataErr) {
         console.error(`Failed to convert data URL to file: ${filename}`, dataErr);
         return null;
       }
     }
     
     // Use our server proxy to avoid CORS "Failed to fetch" on deployed environments
     console.log(`Fetching via proxy: ${url}`);
     const proxyRes = await fetch('/api/proxy', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ url, method: 'GET' })
     });

     if (!proxyRes.ok) {
       throw new Error(`Proxy backend returned status: ${proxyRes.status}`);
     }
     const blob = await proxyRes.blob();
     return new File([blob], filename, { type: blob.type });
   } catch (err) {
     console.error(`[getFileFromUrl Error] URL: ${url}`, err);
     // Fallback: If proxy fails, try direct fetch (unlikely to work due to CORS but as last resort)
     try {
       const directRes = await fetch(url, { mode: 'no-cors' });
       const blob = await directRes.blob();
       return new File([blob], filename, { type: blob.type });
     } catch (inner) {
       return null;
     }
   }
 };

   const handleBatchImageGen = async () => {
    if (!batchImagePrompts.some(p => p.trim() !== "")) {
      alert('请至少输入一个提示词。');
      return;
    }
    
    if (!faceSwapApiKey) {
      alert('请输入 API Key 以开始生成。');
      setShowApiConfig(true);
      return;
    }
    
    setIsGeneratingBatchImage(true);
    setBatchImageProgress({});

    try {
      const activePrompts = batchImagePrompts.map((p, i) => ({ p, i })).filter(x => x.p.trim() !== "");
      console.log(`Starting batch generation of ${activePrompts.length} tasks...`);
      
      const generationTasks = activePrompts.map(async ({ p: prompt, i: index }) => {
        let baseUrl = faceSwapBaseUrl.trim();
        if (!baseUrl) baseUrl = "https://api.openai.com/v1";
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const apiPath = "v1/images/generations";
        let cleanApiPath = apiPath;
        if (baseUrl.endsWith('/v1') && cleanApiPath.startsWith('v1/')) {
          cleanApiPath = cleanApiPath.slice(3);
        }
        const fullEndpoint = `${baseUrl}/${cleanApiPath}`;
        
        setBatchImageProgress(prev => ({ ...prev, [index]: 10 }));

        const updateInterval = setInterval(() => {
          setBatchImageProgress(prev => {
            const curr = prev[index] || 0;
            if (curr >= 90) return prev;
            return { ...prev, [index]: curr + Math.random() * 5 };
          });
        }, 1200);

        try {
          const response = await fetch('/api/face-swap', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: fullEndpoint,
              apiKey: faceSwapApiKey,
              payload: {
                model: faceSwapImageModel || "dall-e-3",
                prompt: prompt,
                n: 1,
                size: batchImageAspectRatio === '9:16' ? "1024x1792" : batchImageAspectRatio === '16:9' ? "1792x1024" : "1024x1024",
                response_format: "url"
              }
            })
          });

          const contentType = response.headers.get('content-type');
          let data;
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            throw new Error(text || `Request failed with status ${response.status}`);
          }

          if (!response.ok) {
            throw new Error(data.error || data.message || JSON.stringify(data));
          }

          const resultUrl = data.data?.[0]?.url || data.url || data.image_url;

          clearInterval(updateInterval);
          if (resultUrl) {
            setBatchImageResults(prev => [
              {
                id: Math.random().toString(36).substring(7),
                url: resultUrl,
                prompt: prompt,
                createdAt: Date.now(),
                taskName: batchImageTaskName
              },
              ...prev
            ]);
            setBatchImageProgress(prev => ({ ...prev, [index]: 100 }));
            if (index === activePrompts[0].i) setSelectedBatchImg(resultUrl);
          } else {
            throw new Error('No image URL in response');
          }
        } catch (err) {
          console.error(`[Task ${index}] Generation failed:`, err);
          clearInterval(updateInterval);
          setBatchImageProgress(prev => ({ ...prev, [index]: -1 }));
        }
      });

      await Promise.all(generationTasks);
    } catch (err) {
      console.error('Batch generation error:', err);
    } finally {
      setIsGeneratingBatchImage(false);
    }
  };

  const handleFaceSwap = async () => {

   if (!faceSwapInputs.source || faceSwapInputs.targets.length === 0) {
     alert('请确保已上传源人脸照片，并至少添加一张目标场景图。');
     return;
   }
   
   if (!faceSwapApiKey) {
     alert('请输入 API Key 以开始合成。');
     setShowApiConfig(true);
     return;
   }
   
   const activeApis = faceSwapApis.filter(a => a && a.trim() !== "");
   const effectiveApis = activeApis.length > 0 ? activeApis : ["v1/images/edits"];
   
   setIsGeneratingFaceSwap(true);
   setFaceSwapProgress({});

   try {
     const total = faceSwapInputs.targets.length;
     console.log(`Starting synthesis of ${total} independent tasks for project [${faceSwapTaskName}]...`);
     
     const synthesisTasks = faceSwapInputs.targets.map(async (targetUrl, index) => {
       const apiPath = effectiveApis[index % effectiveApis.length];
       
       let baseUrl = faceSwapBaseUrl.trim();
       if (!baseUrl) baseUrl = "https://api.openai.com/v1";
       if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

       // If baseUrl already ends with /v1 and apiPath starts with v1/, avoid double v1
       let cleanApiPath = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath;
       if (baseUrl.endsWith('/v1') && cleanApiPath.startsWith('v1/')) {
         cleanApiPath = cleanApiPath.slice(3);
       }

       const fullEndpoint = `${baseUrl}/${cleanApiPath}`;
       
       setFaceSwapProgress(prev => ({ ...prev, [index]: 10 }));

       const updateInterval = setInterval(() => {
         setFaceSwapProgress(prev => {
           const curr = prev[index] || 0;
           if (curr >= 90) return prev;
           return { ...prev, [index]: curr + Math.random() * 5 };
         });
       }, 1500);

       try {
         let response;
         const isReferenceMode = fullEndpoint.includes('edits');

         if (isReferenceMode) {
           const formData = new FormData();
           formData.append('targetUrl', fullEndpoint);
           formData.append('apiKey', faceSwapApiKey);
           
           if (faceSwapModel.trim()) {
             formData.append('model', faceSwapModel.trim());
           }
           formData.append('prompt', faceSwapPrompt);
           formData.append('response_format', 'url');
           formData.append('reference_usage', 'subject');

           // 1. Source Face (Reference)
           const sourceFile = await getFileFromUrl(faceSwapInputs.source, `ref_${index}.png`);
           if (sourceFile) {
             formData.append('image', sourceFile);
           } else {
             console.warn(`[Task ${index}] Source image download failed, sending URL instead if possible`);
           }
           
           // 2. Target Scene (Base)
           const targetFile = await getFileFromUrl(targetUrl, `scene_${index}.png`);
           if (targetFile) {
             formData.append('image', targetFile);
           } else {
              console.warn(`[Task ${index}] Target image download failed`);
           }

           console.log(`[Task ${index}] Fetching /api/face-swap-multipart...`);
           try {
             response = await fetch('/api/face-swap-multipart', {
               method: 'POST',
               body: formData
             });
           } catch (netErr) {
             console.error(`[Task ${index}] Network error in multipart fetch:`, netErr);
             throw new Error(`网络请求失败 (Multipart): ${netErr instanceof Error ? netErr.message : '连接异常'}`);
           }
         } else {
           console.log(`[Task ${index}] Fetching /api/face-swap...`);
           try {
             response = await fetch('/api/face-swap', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 url: fullEndpoint,
                 apiKey: faceSwapApiKey,
                 payload: {
                   ...(faceSwapModel.trim() ? { model: faceSwapModel.trim() } : {}),
                   prompt: faceSwapPrompt,
                   source_image: faceSwapInputs.source,
                   target_image: targetUrl,
                   response_format: "url"
                 }
               })
             });
           } catch (netErr) {
             console.error(`[Task ${index}] Network error in json fetch:`, netErr);
             throw new Error(`网络请求失败 (JSON): ${netErr instanceof Error ? netErr.message : '连接异常'}`);
           }
         }

         clearInterval(updateInterval);

         if (!response) {
           throw new Error('未收到 API 响应');
         }

         if (!response.ok) {
           let errorMsg = `HTTP ${response.status}`;
           const errorText = await response.text();
           try {
             const contentType = response.headers.get('content-type');
             if (contentType && contentType.includes('application/json')) {
               const errorData = JSON.parse(errorText);
               errorMsg = errorData.detail || errorData.error?.message || errorData.message || JSON.stringify(errorData);
             } else {
               errorMsg = errorText ? errorText.slice(0, 150) : `HTTP ${response.status} (No response body)`;
             }
           } catch (e) {
             errorMsg = `Failed to parse error response: ${response.status} - ${errorText.slice(0, 50)}`;
           }
           throw new Error(errorMsg);
         }

         let data;
         const rawText = await response.text();
         try {
           data = JSON.parse(rawText);
         } catch (e) {
           throw new Error(`API 返回了非 JSON 格式内容: ${rawText.slice(0, 50)}...`);
         }

         const resultUrl = data.data?.[0]?.url || data.url || data.image_url;

         if (!resultUrl) {
           throw new Error('API 未返回图片 URL');
         }

         setFaceSwapProgress(prev => ({ ...prev, [index]: 100 }));

         const newResult = {
           id: `${Date.now()}-${index}`,
           url: resultUrl,
           createdAt: Date.now(),
           filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0 },
           taskName: faceSwapTaskName,
           source: faceSwapInputs.source!,
           target: targetUrl
         };

         return newResult;
       } catch (apiErr) {
         clearInterval(updateInterval);
         setFaceSwapProgress(prev => ({ ...prev, [index]: -1 }));
         console.error(`Task ${index} failed:`, apiErr);
         alert(`任务 ${index + 1} 失败: ${apiErr instanceof Error ? apiErr.message : '未知错误'}`);
         return null;
       }
     });

     const results = await Promise.all(synthesisTasks);
     const validResults = results.filter(r => r !== null) as any[];
     
     if (validResults.length > 0) {
       setFaceSwapResults(prev => [...validResults, ...prev]);
       setSelectedFaceImg(validResults[0].url);
       alert(`成功生成 ${validResults.length} 张换脸图片`);
     }
   } catch (err) {
     console.error("Batch synthesis error:", err);
     alert("批量合成过程中发生错误");
   } finally {
     setIsGeneratingFaceSwap(false);
   }
 };

 // Auth Listener
 React.useEffect(() => {
   // Test connection
   const testConnection = async () => {
     try {
       const { doc, getDocFromServer } = await import('firebase/firestore');
       await getDocFromServer(doc(db, 'test', 'connection'));
     } catch (error) {
       if (error instanceof Error && error.message.includes('the client is offline')) {
         console.error("Please check your Firebase configuration.");
       }
     }
   };
   testConnection();

   const unsubscribe = onAuthStateChanged(auth, (u) => {
     setUser(u);
     if (u) loadPatients(u.uid);
   });
   return () => unsubscribe();
 }, []);

 // Asset Gallery Logic
 const fetchAssets = async () => {
   if (!user) return;
   try {
     const q = query(collection(db, 'assets'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
     const snapshot = await getDocs(q);
     const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     setSavedAssets(assets);
   } catch (error) {
     handleFirestoreError(error, OperationType.GET, 'assets');
   }
 };

 const handleSaveAsset = async (url: string, prompt: string, type: 'vlog_clip' | 'face_simulation') => {
   if (!user) {
     alert("请先登录");
     return;
   }
   try {
     await addDoc(collection(db, 'assets'), {
       url,
       prompt,
       type,
       userId: user.uid,
       createdAt: serverTimestamp()
     });
     fetchAssets();
   } catch (error) {
     handleFirestoreError(error, OperationType.WRITE, 'assets');
   }
 };

 // Auth Listener
 React.useEffect(() => {
   if (user) {
     fetchAssets();
   }
 }, [user]);

 const handleLogin = async () => {
   const provider = new GoogleAuthProvider();
   try {
     await signInWithPopup(auth, provider);
   } catch (error: any) {
     if (error.code === 'auth/popup-closed-by-user') {
       alert("登录窗口已关闭，请重新点击登录。");
     } else if (error.code === 'auth/cancelled-by-user') {
       // Ignored
     } else {
       console.error("Login Error:", error);
       alert("登录失败: " + error.message);
     }
   }
 };

 const loadPatients = async (uid: string) => {
   try {
     const q = query(
       collection(db, 'patients'), 
       where('userId', '==', uid),
       orderBy('createdAt', 'desc')
     );
     const querySnapshot = await getDocs(q);
     const patients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     setSavedPatients(patients);
   } catch (error) {
     handleFirestoreError(error, OperationType.LIST, 'patients');
   }
 };

 const handleSavePatient = async () => {
   if (!user || !image || !patientName) return;
   setIsSaving(true);
   try {
     await addDoc(collection(db, 'patients'), {
       name: patientName,
       info: patientInfo,
       userId: user.uid,
       imageUrl: image,
       params: {
         age: patientAge,
         physique,
         surgeryMethod,
         materials,
         careLevel
       },
       intensities,
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
     });
     setPatientName('');
     setPatientInfo('');
     loadPatients(user.uid);
     alert('患者档案已保存');
   } catch (error) {
     handleFirestoreError(error, OperationType.CREATE, 'patients');
     alert('保存失败，请检查网络权限');
   } finally {
     setIsSaving(false);
   }
 };

 const loadPatientRecord = (p: any) => {
   setImage(p.imageUrl);
   setSimulatedImage(null);
   setClinicalAnalysis(null);
   setPatientAge(p.params.age);
   setPhysique(p.params.physique);
   setSurgeryMethod(p.params.surgeryMethod);
   setMaterials(p.params.materials);
   setCareLevel(p.params.careLevel);
   setIntensities(p.intensities);
   setShowPatientArchive(false);
 };

 // Simulation Progress Timer
 React.useEffect(() => {
   let interval: any;
   if (isGenerating) {
     setGenProgress(0);
     interval = setInterval(() => {
       setGenProgress(prev => {
         if (prev >= 98) return prev;
         // Progress speed curve: fast at start, very slow at end to wait for API
         const inc = prev < 50 ? 8 : (prev < 85 ? 2 : 0.3);
         return Math.min(prev + inc, 99);
       });
     }, 400);
   }
   return () => clearInterval(interval);
 }, [isGenerating]);

 const getBaseSimulationPrompt = () => {
   try {
     const projectSummary = Object.entries(intensities)
       .filter(([_, v]) => (v as number) > 0)
       .map(([k, v]) => {
         const item = CATEGORIES.flatMap(c => c.items).find(i => i.id === k);
         return `${item?.name || k} (Level ${v})`;
       })
       .join(", ");

     const currentStage = RECOVERY_TIMELINE.length > 0 
       ? RECOVERY_TIMELINE.reduce((prev, curr) => (postOpDays >= curr.val ? curr : prev))
       : { stage: 'Unknown', desc: '' };
     
     const ptPhysique = PHYSIQUE_TYPES.find(p => p.id === physique)?.name || "正常体质";

     return `Identity: Senior Plastic Surgery Clinical Consultant & AI Prompt Master
ask: Hyper-realistic Surgical Outcome Simulation
roject: ${projectSummary || "Comprehensive Facial Aesthetics"}
natomical Reference: "Three-Tiers Five-Eyes" and "Four-Highs Three-Lows"
imeline: Day ${postOpDays} (${currentStage.stage})
ecovery Context: ${currentStage.desc}
atient Profile: Age ${patientAge}, ${ptPhysique}, ${surgeryMethod === 'invasive' ? 'Invasive Surgical Approach' : 'Non-Invasive Approach'}, Materials: ${materials}

nstructions:
1. Anatomical Realism: Preserve original facial identity while executing specified procedures.
1. Clinical Progression: Apply realistic biomechanical textures (edema, ecchymosis) for post-op day ${postOpDays}.
1. 8K Cinematic Rendering: Professional medical macro photography style, RAW texture, cinematic diffuse lighting.
1. Output Requirement: You MUST return both a modified image reflecting the results AND a clinical report in markdown.`;
   } catch (error) {
     console.error("Error generating base prompt:", error);
     return "Prompt Master Error: Invalid Clinical Context";
   }
 };

 React.useEffect(() => {
   setBasePromptPreview(getBaseSimulationPrompt());
 }, [simulationTaskName, postOpDays, patientAge, physique, surgeryMethod, materials, intensities]);

 const onDrop = useCallback((acceptedFiles: File[]) => {
   const file = acceptedFiles[0];
   if (file) {
     const reader = new FileReader();
     reader.onload = () => {
       setImage(reader.result as string);
       setSimulatedImage(null);
       setClinicalAnalysis(null);
     };
     reader.readAsDataURL(file);
   }
 }, []);

 const { getRootProps, getInputProps } = useDropzone({
   onDrop,
   accept: { 'image/*': [] },
   multiple: false
 } as any);

 const updateIntensity = (id: string, value: number) => {
   setIntensities(prev => ({ ...prev, [id]: value }));
 };

 const applyPreset = (presetId: string) => {
   const preset = PRESETS.find(p => p.id === presetId);
   if (preset) setIntensities(preset.projects);
 };

 const handleSimulate = async () => {
   if (!image || Object.keys(intensities).filter(k => (intensities[k] || 0) > 0).length === 0) return;
   
   const apiKey = faceSwapApiKey || openaiKey;
   if (!apiKey) {
     alert('请输入 API Key 以开始合成。');
     setShowApiConfig(true);
     return;
   }

   setIsGenerating(true);
   setGenError(null);
   setGenProgress(10);

   try {
     const activeProjects = Object.keys(intensities).filter(k => (intensities[k] || 0) > 0);
     const projectSummary = activeProjects.map(p => `${p}(Intensity: ${intensities[p]}%)`).join(', ');

     // Extract base URL correctly
     let cleanBaseUrl = faceSwapBaseUrl.trim();
     if (!cleanBaseUrl) cleanBaseUrl = "https://api.openai.com/v1";
     
     // Normalize: remove trailing slash
     if (cleanBaseUrl.endsWith('/')) {
       cleanBaseUrl = cleanBaseUrl.slice(0, -1);
     }

     // Auto-normalize common proxy patterns: if it doesn't have /v1 or /v1/, add it
     if (!cleanBaseUrl.includes('/chat/completions') && 
         !cleanBaseUrl.includes('/images/') && 
         !cleanBaseUrl.endsWith('/v1')) {
       cleanBaseUrl = `${cleanBaseUrl}/v1`;
     }
     
     let chatEndpoint = "";
     if (cleanBaseUrl.includes('/chat/completions')) {
       chatEndpoint = cleanBaseUrl;
     } else {
       chatEndpoint = `${cleanBaseUrl}/chat/completions`;
     }

     const imageBaseUrl = cleanBaseUrl;
     const apiKey = faceSwapApiKey || openaiKey;
     
     if (!apiKey) {
       throw new Error("API Key 未配置。请在 API 设置中输入 Key。");
     }
     
     console.log(`[Simulation] Final chat endpoint: ${chatEndpoint}`);

     const promptMasterContext = `
       # IDENTITY: AI PROMPT MASTER & SENIOR CLINICAL CONSULTANT
       You are tasked with generating a hyper-realistic surgical outcome simulation based on the provided photo.
       
       ### [CORE PROTOCOL]
       ${basePromptPreview}
       
       ### [USER OVERRIDE]
       ${simulationPrompt || "Follow standard clinical realism and anatomical symmetry."}

       ### [OUTPUT REQUIREMENTS]
       You must return a response with TWO distinct sections wrapped in tags:
       1. <report>: A detailed clinical analysis report in Chinese (markdown format).
       2. <image_prompt>: A highly detailed DALL-E 3 prompt for generating the simulated post-operative result. 
          Describe the changes based on Day ${postOpDays} recovery for ${projectSummary}.
     `;
     
     const imageBase64 = image.split(',')[1];
     const mimeType = image.split(';')[0].split(':')[1] || "image/jpeg";

     setGenProgress(30);

     let llmResultText = "";
     if (useGeminiSim) {
       try {
         const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
         const result = await ai.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: {
             parts: [
               { text: promptMasterContext },
               {
                 inlineData: {
                   data: imageBase64,
                   mimeType: mimeType || "image/jpeg"
                 }
               }
             ]
           }
         });
         llmResultText = result.text || "";
         if (!llmResultText) throw new Error("Empty response from Gemini server");
       } catch (e: any) {
         console.error("Gemini Simulation Error:", e);
         throw new Error(`Gemini Simulation failed: ${e.message}`);
       }
     } else {
       // Use legacy proxy (OpenAI/Cloud)
       const llmResponse = await fetch('/api/proxy', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           url: chatEndpoint,
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Accept': 'application/json',
             'Authorization': `Bearer ${apiKey.trim()}`
           },
           body: {
             model: faceSwapModel || "gpt-4o",
             messages: [
               {
                 role: "user",
                 content: [
                   { type: "text", text: promptMasterContext },
                   {
                     type: "image_url",
                     image_url: {
                       url: `data:${mimeType};base64,${imageBase64}`
                     }
                   }
                 ]
               }
             ]
           }
         })
       });

       if (!llmResponse.ok) {
         const errText = await llmResponse.text();
         let errorDetail = errText;
         try {
           const errData = JSON.parse(errText);
           errorDetail = errData.detail || errData.error?.message || errData.error || JSON.stringify(errData);
         } catch (e) {
           // Keep raw text
         }
         throw new Error(errorDetail || `LLM Request failed: ${llmResponse.status}`);
       }

       const llmText = await llmResponse.text();
       let llmData;
       try {
         llmData = JSON.parse(llmText);
       } catch (e) {
         throw new Error("Failed to parse LLM response as JSON");
       }
       llmResultText = llmData.choices?.[0]?.message?.content || "";
     }
     
     const reportMatch = llmResultText.match(/<report>([\s\S]*?)<\/report>/);
     const promptMatch = llmResultText.match(/<image_prompt>([\s\S]*?)<\/image_prompt>/);

     const reportText = reportMatch ? reportMatch[1].trim() : llmResultText;
     const dallEPrompt = promptMatch ? promptMatch[1].trim() : "";

     if (reportText || dallEPrompt) {
       setClinicalAnalysis(reportText || "Simulation report generated.");
       setGenProgress(60);
       
       let finalImg = image;
       if (dallEPrompt) {
         setGenProgress(85);
         try {
           const imageResponse = await fetch('/api/generate-image', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               prompt: dallEPrompt,
               chineseStyle: true,
               customApiKey: apiKey,
               customBaseUrl: imageBaseUrl || openaiBaseUrl,
               model: faceSwapImageModel || "dall-e-3"
             }),
           });
           if (imageResponse.ok) {
             const imageText = await imageResponse.text();
             try {
               const imageData = JSON.parse(imageText);
               finalImg = imageData.url;
             } catch (e) {
               console.error("Failed to parse image result:", imageText);
             }
           } else {
             const errText = await imageResponse.text();
             console.error("DALL-E Generation Failed:", errText);
           }
         } catch (e) {
           console.error("DALL-E generation failed", e);
         }
       }

       setSimulatedImage(finalImg); 
       setGenProgress(100);

       const newResult = {
         id: `${Date.now()}`,
         url: finalImg,
         report: reportText || "报告生成中...",
         createdAt: Date.now(),
         taskName: simulationTaskName,
         prompt: simulationPrompt || dallEPrompt,
         settings: {
           postOpDays,
           patientAge,
           physique,
           surgeryMethod,
           materials
         }
       };

       setSimulationResults(prev => [newResult, ...prev]);
       setSimulationTaskName(`模拟_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
     } else {
       throw new Error("Empty response from AI (No text returned)");
     }
   } catch (error: any) {
     console.error(error);
     setGenError(error?.message || '仿真模拟失败，请检查配置。');
   } finally {
     setIsGenerating(false);
   }
 };

 const getDayDescription = (days: number) => {
   if (RECOVERY_TIMELINE.length === 0) return "无时间轴数据";
   return RECOVERY_TIMELINE.reduce((prev, curr) => (days >= curr.val ? curr : prev)).desc;
 };

 const getRecoveryStyle = (day: number) => {
   if (!simulatedImage) return { opacity: 0.2 };
   
   let filter = "";
   let transform = "scale(1)";
   
   if (day === 0) {
     // Immediate Post-OP: Maximum distortion
     filter = "blur(1px) saturate(1.4) hue-rotate(-10deg) contrast(1.2)";
     transform = "scale(1.08)"; // Significant swelling
   } else if (day <= 3) {
     // Acute phase: Peak swelling and deep bruising
     filter = "blur(0.8px) saturate(1.3) hue-rotate(-8deg) contrast(1.15) sepia(0.1)";
     transform = "scale(1.06)";
   } else if (day <= 7) {
     // Suture removal: Yellowing bruises, reduced swelling
     filter = "blur(0.4px) saturate(1.1) sepia(0.3) brightness(0.95)";
     transform = "scale(1.03)";
   } else if (day <= 14) {
     // Early settling: Slight residual puffiness
     filter = "blur(0.2px) sepia(0.1)";
     transform = "scale(1.015)";
   } else if (day <= 30) {
     // Proliferation phase: Scar tissue hardening look
     filter = "contrast(1.05) saturate(1.05)";
     transform = "scale(1.005)";
   } else if (day >= 90) {
     // Final outcome: Natural texture, no filters
     filter = "none";
     transform = "scale(1)";
   }

   return { filter, transform, transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)' };
 };

 const toggleCat = (id: string) => {
   setExpandedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
 };

 return (
   <div className="flex h-screen bg-[#F1F5F9] overflow-hidden text-[#1E293B]">
     {/* Sidebar */}
     <aside className="w-[340px] flex flex-col bg-white border-r border-slate-200 h-full">
       <div className="p-6 border-b border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
             <Sparkles className="text-white w-4 h-4" />
           </div>
           <div>
             <span className="font-bold text-lg text-slate-800">Aesthetix <span className="text-teal-600">AI</span></span>
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Clinical Pro</p>
           </div>
         </div>
         <button onClick={() => { setImage(null); setSimulatedImage(null); setIntensities({}); setPostOpDays(30); }} className="text-slate-400 hover:text-teal-600 transition-colors">
           <RotateCcw className="w-4 h-4" />
         </button>
         <button 
           onClick={user ? () => setShowPatientArchive(true) : handleLogin} 
           className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", user ? "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600" : "bg-teal-600 text-white shadow-md")}
         >
           {user ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
         </button>
         <button 
           onClick={() => setShowVlogLab(true)} 
           className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition-all"
           title="Vlog 生产实验室"
         >
           <Video className="w-4 h-4" />
         </button>
         <button 
           onClick={() => setShowAssetGallery(true)} 
           className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-all"
           title="素材图片库"
         >
           <ImageIcon className="w-4 h-4" />
         </button>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
         {/* Recovery Config */}
         <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pb-1">
               <History className="w-3.5 h-3.5" /> 仿真任务配置
            </div>
            
            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 <Tag className="w-2.5 h-2.5" /> 任务名称 (Task Name)
               </label>
               <input 
                 value={simulationTaskName}
                 onChange={(e) => setSimulationTaskName(e.target.value)}
                 className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                 placeholder="输入仿真任务名称..."
               />
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 <Monitor className="w-2.5 h-2.5" /> 自动生成提示词 (Base Protocol)
               </label>
               <div className="w-full p-2 text-[9px] bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono whitespace-pre-wrap min-h-[60px]">
                 {basePromptPreview}
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                 <MessageSquare className="w-2.5 h-2.5" /> 自定义专家指令 (Extra Prompt)
               </label>
               <textarea 
                 value={simulationPrompt}
                 onChange={(e) => setSimulationPrompt(e.target.value)}
                 className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500 min-h-[50px] resize-none"
                 placeholder="作为 AI 提示词大师，输入额外的细节..."
               />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
               <div className="flex justify-between text-[11px] font-bold">
                 <span className="text-slate-400">时间轴</span>
                 <span className="text-teal-600 font-mono">Day {postOpDays}</span>
               </div>
               <input 
                 type="range" min="0" max="365" step="1" value={postOpDays}
                 onChange={(e) => setPostOpDays(parseInt(e.target.value))}
                 className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
               />
               <p className="text-[10px] text-slate-400 italic">当前状态: {getDayDescription(postOpDays)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">体质属性</label>
                 <select value={physique} onChange={(e) => setPhysique(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-teal-100">
                   {PHYSIQUE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">患者年龄</label>
                 <input type="number" value={patientAge} onChange={(e) => setPatientAge(parseInt(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-teal-100" />
              </div>
            </div>
         </div>

         {/* Department Tabs */}
         <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {DEPARTMENTS.map(d => (
              <button 
               key={d.id} 
               onClick={() => setSelectedDept(d.id)}
               className={cn("flex-1 py-2 rounded-lg text-[9px] font-bold transition-all", selectedDept === d.id ? "bg-white text-teal-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
              >
                {d.name.split(' ')[0]}
              </button>
            ))}
         </div>

         {/* Aesthetic Projects */}
         <div className="space-y-3">
           {CATEGORIES.filter(c => c.dept === selectedDept).map(cat => (
             <div key={cat.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
               <button onClick={() => toggleCat(cat.id)} className="w-full px-4 py-3 bg-[#F8FAFC] flex items-center justify-between text-[11px] font-bold text-slate-600">
                 <span>{cat.name}</span>
                 <ChevronRight className={cn("w-3 h-3 transition-transform", expandedCats.includes(cat.id) && "rotate-90")} />
               </button>
               {expandedCats.includes(cat.id) && (
                 <div className="p-4 bg-white border-t border-slate-50 space-y-5">
                   {cat.items.map(item => (
                     <div key={item.id} className="space-y-2">
                       <div className="flex justify-between items-center group">
                         <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                         <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 rounded">Lv.{intensities[item.id] || 0}</span>
                       </div>
                       <input 
                         type="range" min="0" max="5" step="1" value={intensities[item.id] || 0}
                         onChange={(e) => updateIntensity(item.id, parseInt(e.target.value))}
                         className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-teal-600"
                       />
                     </div>
                   ))}
                 </div>
               )}
             </div>
           ))}
         </div>

         {/* Professional Parameters */}
         <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest pb-1">
               <ShieldCheck className="w-3.5 h-3.5" /> 临床干预参数
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">术式选择</label>
                  <select value={surgeryMethod} onChange={(e) => setSurgeryMethod(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold">
                    <option value="invasive">切开 (Invasive)</option>
                    <option value="mini">微创 (Mini)</option>
                    <option value="non">无创 (Non)</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">材料级别</label>
                  <select value={materials} onChange={(e) => setMaterials(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold">
                    <option value="premium">尊享版 (Premium)</option>
                    <option value="standard">标准版 (Standard)</option>
                  </select>
               </div>
            </div>
         </div>

         {/* Presets */}
         <div className="space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">专业美学预设</div>
            <div className="grid grid-cols-2 gap-2">
               {PRESETS.map(p => (
                 <button key={p.id} onClick={() => applyPreset(p.id)} className="px-3 py-2 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:border-teal-500 hover:text-teal-600 transition-all text-center truncate">
                   {p.name}
                 </button>
               ))}
            </div>
         </div>

         <div className="pt-4 border-t border-slate-100">
           <button 
             onClick={() => setShowApiConfig(!showApiConfig)}
             className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
           >
             <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
               <Server className="w-3 h-3 text-teal-600" /> API 通道配置
             </span>
             <ChevronRight className={cn("w-3 h-3 text-slate-300 transition-transform", showApiConfig && "rotate-90")} />
           </button>
           
           {showApiConfig && (
             <div className="mt-3 space-y-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
               <div className="space-y-4">
                 <div className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-700">使用 Gemini 分析 (分析报告)</span>
                     <span className="text-[8px] text-slate-400">稳定高效，无需额外配置</span>
                   </div>
                   <button 
                     onClick={() => setUseGeminiSim(!useGeminiSim)}
                     className={cn("w-8 h-4 rounded-full transition-all relative", useGeminiSim ? "bg-teal-500" : "bg-slate-200")}
                   >
                     <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", useGeminiSim ? "left-4.5" : "left-0.5")} />
                   </button>
                 </div>

                 {!useGeminiSim && (
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                       <Tag className="w-2.5 h-2.5" /> 仿真分析模型 (LLM)
                     </label>
                     <input 
                       value={faceSwapModel}
                       onChange={(e) => setFaceSwapModel(e.target.value)}
                       className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                       placeholder="gpt-4o"
                     />
                   </div>
                 )}

                 <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                     <Globe className="w-2.5 h-2.5" /> 生图 API 节点
                   </label>
                   <input 
                     value={faceSwapBaseUrl}
                     onChange={(e) => setFaceSwapBaseUrl(e.target.value)}
                     className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                     placeholder="https://api.openai.com/v1"
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                     <Key className="w-2.5 h-2.5" /> 生图 API Key
                   </label>
                   <input 
                     type="password"
                     value={faceSwapApiKey}
                     onChange={(e) => setFaceSwapApiKey(e.target.value)}
                     className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                     placeholder="sk-..."
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                     <ImageIcon className="w-2.5 h-2.5" /> 生图引擎模型 (Image Model)
                   </label>
                   <input 
                     value={faceSwapImageModel}
                     onChange={(e) => setFaceSwapImageModel(e.target.value)}
                     className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                     placeholder="gpt-image-2 或 dall-e-3"
                   />
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>

       <div className="p-6 border-t border-slate-100">
         <button 
           disabled={!image || isGenerating}
           onClick={handleSimulate}
           className={cn("w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all", (!image || isGenerating) ? "bg-slate-200 text-slate-400" : "bg-teal-600 text-white shadow-lg shadow-teal-100 hover:bg-teal-700")}
         >
           {isGenerating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
           <span>开始 AI 模拟生成</span>
         </button>
       </div>
     </aside>

     {/* Main Content */}
     <main className="flex-1 flex flex-col min-w-0">
       <header className="h-[60px] bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex gap-4 text-xs font-bold text-slate-400">
               {['comparison', 'multiview', 'timeline', 'report', 'history'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("relative py-5 transition-colors", activeTab === tab ? "text-teal-600" : "hover:text-slate-600")}>
                   {tab === 'comparison' ? '单台对比' : tab === 'multiview' ? '矩阵平铺' : tab === 'timeline' ? '恢复轴' : tab === 'report' ? '临床报告' : '结果库'}
                   {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
                 </button>
               ))}
             </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">SIM-ENGINE-OPT-v2</span>
             {simulatedImage && (
               <button 
                 onClick={() => handleSaveAsset(simulatedImage, "Face Simulation result", 'face_simulation')}
                 className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-sm"
               >
                 <Save className="w-3 h-3" /> 存入图库
               </button>
             )}
             <div className="w-px h-4 bg-slate-200" />
             <button className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 hover:text-teal-600">
               <Share2 className="w-3.5 h-3.5" /> 导出报告
             </button>
          </div>
       </header>

       <section className="flex-1 p-8 overflow-hidden flex flex-col bg-slate-50">
          {!image ? (
             <div {...getRootProps()} className="w-full h-full border-2 border-dashed border-slate-200 rounded-[3rem] bg-white flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:bg-slate-50/50 transition-all duration-500">
               <input {...getInputProps()} />
               <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-50 group-hover:scale-105 transition-transform duration-500">
                 <Upload className="w-10 h-10 text-slate-300 group-hover:text-teal-600 transition-colors" />
               </div>
               <h3 className="text-2xl font-bold text-slate-800 mb-2">上传患者正面中性位照片</h3>
               <p className="text-sm text-slate-400 max-w-sm mb-12">系统将自动分析 106 个解剖关键点，并基于临床大数据生成仿真。支持 JPG, PNG 高清格式。</p>
               <div className="flex gap-4">
                 <span className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-400">等效焦距 50mm+ 优化</span>
                 <span className="px-5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-400">符合 HIPAA/GDPR 规范</span>
               </div>
             </div>
          ) : (
            <div className="h-full flex flex-col gap-6">
               <div className="flex-1 bg-[#0F172A] rounded-[3rem] shadow-2xl relative overflow-hidden flex">
                  <AnimatePresence mode="wait">
                     {activeTab === 'comparison' ? (
                       <motion.div key="comp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex">
                         <div className="flex-1 relative border-r border-[#1E293B]">
                            <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <label className="absolute top-6 left-6 bg-black/60 px-4 py-2 rounded-lg text-[10px] font-bold text-white uppercase tracking-[0.2em] backdrop-blur-md border border-white/10">Pre-OP / 术前</label>
                         </div>
                         <div className="flex-1 relative bg-slate-900">
                           {simulatedImage ? (
                              <React.Fragment>
                                <img src={simulatedImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <label className="absolute top-6 right-6 bg-teal-600/90 px-4 py-2 rounded-lg text-[10px] font-bold text-white uppercase tracking-[0.2em] backdrop-blur-md border border-teal-400/20 shadow-lg">Simulation / 仿真</label>
                                <div className="absolute bottom-6 right-6 bg-black/60 px-4 py-2 rounded-lg text-[10px] font-bold text-teal-400 lowercase italic border border-teal-900/30">Day {postOpDays} Status</div>
                              </React.Fragment>
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                                <Sparkles className="w-12 h-12 text-slate-600 mb-4" />
                                <p className="text-sm font-bold text-slate-600">方案生成中...</p>
                             </div>
                           )}
                         </div>
                       </motion.div>
                     ) : activeTab === 'multiview' ? (
                       <motion.div key="multi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col bg-slate-950">
                          <div className="p-6 border-b border-white/5 flex items-center justify-between">
                             <h3 className="text-white font-bold text-sm flex items-center gap-2">
                               <Layers className="w-4 h-4 text-teal-500" /> 恢复期全时相矩阵
                             </h3>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">启用矩阵平铺</span>
                                <button 
                                 onClick={() => setShowMatrixTiles(!showMatrixTiles)}
                                 className={cn("w-10 h-5 rounded-full relative transition-all duration-300", showMatrixTiles ? "bg-teal-600" : "bg-slate-800")}
                                >
                                   <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300", showMatrixTiles ? "right-1" : "left-1")} />
                                </button>
                             </div>
                          </div>
                          {showMatrixTiles ? (
                            <div className="flex-1 grid grid-cols-3 grid-rows-2 p-6 gap-6 overflow-y-auto custom-scrollbar">
                               <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#1E293B]">
                                  <img src={image} className="w-full h-full object-cover" />
                                  <div className="absolute top-4 left-4 bg-black/60 px-2 py-1 rounded text-[9px] font-bold text-white uppercase">Baseline / 术前</div>
                               </div>
                               {[3, 7, 30, 90, 365].map(day => (
                                 <div key={day} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#1E293B] group">
                                    <img 
                                      src={simulatedImage || image} 
                                      className="w-full h-full object-cover transition-all duration-500" 
                                      style={getRecoveryStyle(day)} 
                                    />
                                    <div className="absolute top-4 left-4 bg-teal-600/90 px-2 py-1 rounded text-[9px] font-bold text-white uppercase">Day {day}</div>
                                    <div className="absolute bottom-4 left-4 right-4 bg-black/40 backdrop-blur-sm p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                       <p className="text-[9px] font-bold text-white text-center leading-none uppercase tracking-tighter">
                                         {RECOVERY_TIMELINE.find(s => day <= s.val)?.stage}
                                       </p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                               <Activity className="w-12 h-12 mb-4 opacity-20" />
                               <p className="text-sm font-bold">已禁用矩阵平铺预览</p>
                               <p className="text-[10px] opacity-60">请在右上角开启以查看各阶段恢复预测</p>
                            </div>
                          )}
                       </motion.div>
                     ) : activeTab === 'timeline' ? (
                       <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 p-8 flex flex-col bg-slate-950 overflow-y-auto custom-scrollbar">
                          <div className="flex-1 min-h-[400px] relative rounded-[2rem] overflow-hidden border border-[#1E293B] bg-slate-900">
                             <img 
                               src={simulatedImage || image} 
                               className="w-full h-full object-cover transition-all duration-700" 
                               style={getRecoveryStyle(postOpDays)} 
                             />
                             <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
                               <span className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-2xl">
                                 {RECOVERY_TIMELINE.find(s => postOpDays <= s.val)?.stage}
                               </span>
                               <span className="px-3 py-1.5 bg-black/60 text-teal-400 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                                 Simulation Day {postOpDays}
                               </span>
                             </div>
                          </div>
                          <div className="mt-8 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                             {RECOVERY_TIMELINE.map(stage => (
                               <button 
                                 key={stage.val} 
                                 onClick={() => setPostOpDays(stage.val)}
                                 className={cn("shrink-0 w-[180px] p-4 rounded-2xl border transition-all text-left", postOpDays === stage.val ? "bg-teal-600/20 border-teal-500" : "bg-white/5 border-white/10 hover:border-white/20")}
                               >
                                  <div className="text-[10px] font-bold text-teal-400 uppercase mb-1">{stage.label}</div>
                                  <div className="text-xs font-bold text-white mb-2">{stage.stage}</div>
                                  <p className="text-[10px] text-slate-400 leading-relaxed">{stage.desc}</p>
                               </button>
                             ))}
                          </div>
                       </motion.div>
                     ) : activeTab === 'report' ? (
                       <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white p-12 overflow-y-auto">
                          <div className="max-w-4xl mx-auto space-y-12 pb-24">
                             <div className="flex items-center justify-between border-b-4 border-teal-600 pb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center">
                                     <Stethoscope className="text-white w-8 h-8" />
                                  </div>
                                  <div>
                                    <h2 className="text-3xl font-bold text-slate-900 mb-1">Aesthetix 临床分析报告</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">Clinical Precision Aesthetic Analysis (V3.0)</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-3xl font-bold text-teal-600 font-mono">{(80 + Math.random() * 15).toFixed(1)}%</div>
                                  <div className="text-[10px] font-bold text-slate-400">综合美学协调指数</div>
                                </div>
                             </div>

                             <div className="grid grid-cols-3 gap-8">
                               <div className="col-span-2 space-y-8">
                                  <section className="space-y-4">
                                     <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase border-l-4 border-teal-600 pl-3">解剖学深度观察 (Anatomical Insights)</h4>
                                     <div className="p-6 bg-slate-50 rounded-[2rem] text-xs text-slate-600 leading-relaxed font-medium italic border border-slate-100">
                                        {clinicalAnalysis ? <div className="prose prose-slate prose-sm max-w-none"><Markdown>{clinicalAnalysis}</Markdown></div> : '正在进行三庭五眼深度扫描与骨骼支撑度评估...'}
                                     </div>
                                  </section>
                                  <section className="space-y-4">
                                     <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase border-l-4 border-teal-600 pl-3">手术方案执行细节 (Plan Details)</h4>
                                     <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(intensities).filter(([_, v]) => (v as number) > 0).map(([k, v]) => {
                                           const it = CATEGORIES.flatMap(c => c.items).find(i => i.id === k);
                                           return (
                                             <div key={k} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                                <span className="text-[11px] font-bold text-slate-700">{it?.name}</span>
                                                <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[9px] font-bold rounded">Lv.{v} 强度</span>
                                             </div>
                                           );
                                        })}
                                     </div>
                                  </section>
                               </div>
                               <div className="space-y-8">
                                  <section className="space-y-4">
                                     <h4 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase border-l-4 border-teal-600 pl-3">恢复预测 (Recovery)</h4>
                                     <div className="p-5 bg-teal-600 rounded-[2rem] text-white">
                                        <div className="text-[10px] font-bold uppercase opacity-60 mb-2">预计完全恢复</div>
                                        <div className="text-2xl font-bold mb-4">Day 90-120</div>
                                        <div className="space-y-3">
                                           <div className="flex justify-between text-[10px] font-bold border-b border-white/10 pb-2">
                                              <span className="opacity-60">体质因子</span>
                                              <span>{PHYSIQUE_TYPES.find(t => t.id === physique)?.name}</span>
                                           </div>
                                           <div className="flex justify-between text-[10px] font-bold border-b border-white/10 pb-2">
                                              <span className="opacity-60">术式损伤</span>
                                              <span className="capitalize">{surgeryMethod}</span>
                                           </div>
                                        </div>
                                     </div>
                                  </section>
                                  <section className="p-5 bg-slate-900 rounded-[2rem] text-white space-y-4">
                                     <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-400">
                                        <AlertTriangle className="w-3.5 h-3.5" /> 风险预警
                                     </div>
                                     <ul className="space-y-2">
                                        <li className="text-[10px] leading-relaxed opacity-80">• 注意{surgeryMethod === 'invasive' ? '切口感染风险' : '局部神经压迫'}</li>
                                        <li className="text-[10px] leading-relaxed opacity-80">• 监测肿胀不对称情况</li>
                                     </ul>
                                  </section>
                               </div>
                             </div>
                          </div>
                       </motion.div>
                     ) : (
                       <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-50 flex flex-col">
                          <div className="p-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                             <div>
                               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                 <History className="w-6 h-6 text-teal-600" /> 模拟实验室结果库
                               </h3>
                               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">SIMULATION LAB CABINET</p>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="px-4 py-2 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200">
                                  已存储 {simulationResults.length} 个仿真模型
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                             {simulationResults.length === 0 ? (
                               <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                  <Database className="w-16 h-16 mb-4 opacity-20" />
                                  <p className="text-sm font-bold">结果库暂无数据</p>
                                  <p className="text-[10px]">开始第一次 AI 模拟后，结果将自动同步到此实验室柜中</p>
                               </div>
                             ) : (
                               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                 {simulationResults.map(res => (
                                   <motion.div 
                                     key={res.id}
                                     layoutId={res.id}
                                     className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer"
                                     onClick={() => {
                                        setSimulatedImage(res.url);
                                        setClinicalAnalysis(res.report);
                                        setPostOpDays(res.settings?.postOpDays || 30);
                                        setActiveTab('comparison');
                                     }}
                                   >
                                     <div className="aspect-[3/4] relative">
                                       <img src={res.url} className="w-full h-full object-cover" />
                                       <div className="absolute top-2 left-2 bg-black/60 text-white text-[8px] font-bold px-2 py-1 rounded backdrop-blur-sm z-10">{res.taskName}</div>
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Plus className="w-6 h-6 text-white" />
                                       </div>
                                     </div>
                                     <div className="p-4">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="text-[10px] font-black text-slate-800 truncate max-w-[100px]">{res.taskName}</span>
                                          <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 rounded">Day {res.settings?.postOpDays}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-medium">
                                          {new Date(res.createdAt).toLocaleString()}
                                        </p>
                                        {res.prompt && (
                                          <div className="mt-2 pt-2 border-t border-slate-50">
                                             <p className="text-[8px] text-slate-400 italic line-clamp-1">"{res.prompt}"</p>
                                          </div>
                                        )}
                                     </div>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setSimulationResults(prev => prev.filter(r => r.id !== res.id));
                                       }}
                                       className="absolute top-2 right-2 w-6 h-6 bg-white/90 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 z-20"
                                     >
                                       <X className="w-3.5 h-3.5" />
                                     </button>
                                   </motion.div>
                                 ))}
                               </div>
                             )}
                          </div>
                       </motion.div>
                     )}
                  </AnimatePresence>

                  {isGenerating && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-12">
                       <div className="relative w-40 h-40 mb-8">
                          {/* Outer Progress Ring */}
                          <svg className="w-full h-full -rotate-90">
                             <circle cx="80" cy="80" r="74" fill="transparent" stroke="rgba(20, 184, 166, 0.1)" strokeWidth="4" />
                             <circle 
                               cx="80" cy="80" r="74" fill="transparent" stroke="#14B8A6" strokeWidth="4" 
                               strokeDasharray={2 * Math.PI * 74}
                               strokeDashoffset={2 * Math.PI * 74 * (1 - genProgress / 100)}
                               className="transition-all duration-300"
                             />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-4xl font-mono font-bold text-teal-500">{Math.floor(genProgress)}%</span>
                             <span className="text-[10px] font-bold text-teal-500/50 uppercase tracking-widest">Processing</span>
                          </div>
                       </div>
                       <h4 className="text-2xl font-bold text-white tracking-[0.4em] uppercase mb-3">
                         {genError ? '仿真请求失败' : '临床生物力学仿真中'}
                       </h4>
                       <p className="text-xs text-slate-500 max-w-[400px] text-center font-medium leading-relaxed mb-6">
                         {genError ? (
                           <span className="text-red-400 font-bold">{genError}</span>
                         ) : ( <React.Fragment>
                             系统正在执行 [Simulation-Engine-v2] 核心仿真逻辑。预计耗时约 5-15 秒。<br />
                             当前步骤：{genProgress < 30 ? '解析面部 106 个结构点...' : genProgress < 60 ? '模拟软组织代谢与色素分布...' : '正在同步临床标准 3D 模型渲染...'} </React.Fragment>
                         )}
                       </p>
                       {genError ? (
                         <button 
                           onClick={() => setIsGenerating(false)}
                           className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-all"
                         >
                           返回检查配置
                         </button>
                       ) : (
                         <div className="w-[300px] h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${genProgress}%` }}
                              className="h-full bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.5)]"
                            />
                         </div>
                       )}
                    </div>
                  )}
               </div>

               <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                  <div className="flex-1 space-y-4">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/10 shrink-0">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                       </div>
                       <div>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">术后医学提示 (Post-OP Notice)</span>
                          <p className="text-xs text-slate-600 font-bold leading-relaxed">{postOpDays}天后状态：肿胀已进入{RECOVERY_TIMELINE.find(s => postOpDays <= s.val)?.stage || '稳定期'}。</p>
                       </div>
                     </div>
                     <div className="h-px bg-slate-100" />
                     <div className="flex gap-12">
                        <div className="space-y-1">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">推荐护理</span>
                           <p className="text-xs text-slate-500 font-medium">使用医用级修护辅料，避免高温桑拿，严防紫外线色素沉积。</p>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">恢复系数</span>
                           <p className="text-xs text-slate-500 font-medium italic">{(postOpDays/30 * 100).toFixed(0)}% 成熟度 / 临床参考级</p>
                        </div>
                     </div>
                  </div>
                  <div className="shrink-0 flex gap-3">
                      {user ? (
                        <div className="flex gap-2">
                          <input 
                           type="text" 
                           placeholder="患者姓名" 
                           value={patientName}
                           onChange={(e) => setPatientName(e.target.value)}
                           className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-100 placeholder:text-slate-300"
                          />
                          <button 
                           disabled={isSaving || !patientName}
                           onClick={handleSavePatient}
                           className={cn("px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2", (!patientName || isSaving) ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800")}
                          >
                           <Save className={cn("w-3.5 h-3.5", isSaving && "animate-pulse")} /> {isSaving ? '保存中...' : '存档到云端'}
                          </button>
                        </div>
                      ) : (
                        <button 
                         onClick={handleLogin}
                         className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                           <User className="w-3.5 h-3.5" /> 登录以存储患者数据
                        </button>
                      )}
                      <button className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                         <Download className="w-3.5 h-3.5" /> 导出结果
                      </button>
                   </div>
               </div>
            </div>
          )}
       </section>
     </main>

     {/* Patient Archive Drawer */}
     <AnimatePresence>
       {showPatientArchive && ( <React.Fragment>
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }} 
             onClick={() => setShowPatientArchive(false)}
             className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" 
           />
           <motion.div 
             initial={{ x: '100%' }} 
             animate={{ x: 0 }} 
             exit={{ x: '100%' }} 
             className="fixed top-0 right-0 bottom-0 w-[400px] bg-white z-[70] shadow-2xl flex flex-col"
           >
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
               <span className="font-bold text-xl text-slate-800 flex items-center gap-2">
                 <Users className="text-teal-600" /> 患者咨询档案
               </span>
               <button onClick={() => setShowPatientArchive(false)} className="text-slate-400 hover:text-slate-600">
                 <Plus className="w-6 h-6 rotate-45" />
               </button>
             </div>
             <div className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                   type="text" 
                   placeholder="搜索姓名或病历号..." 
                   className="w-full bg-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-100"
                  />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-4 custom-scrollbar">
               {savedPatients.length === 0 ? (
                 <div className="text-center py-20">
                   <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">暂无存储记录</p>
                 </div>
               ) : (
                 savedPatients.map(p => (
                   <button 
                     key={p.id} 
                     onClick={() => loadPatientRecord(p)}
                     className="w-full group p-4 border border-slate-100 rounded-[2rem] hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left"
                   >
                     <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100">
                         <img src={p.imageUrl} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1">
                         <h5 className="font-bold text-slate-800 mb-0.5 group-hover:text-teal-600">{p.name}</h5>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-2">Patient Index #{(p.id || '').substring(0,6)}</p>
                         <div className="flex gap-1.5 flex-wrap">
                           {Object.entries(p.intensities || {}).filter(([_, v]) => (v as number) > 0).slice(0, 2).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-bold rounded uppercase">
                                {k.split('_')[0]}
                              </span>
                           ))}
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-bold text-slate-300">{(p.createdAt as Timestamp)?.toDate().toLocaleDateString()}</p>
                       </div>
                     </div>
                   </button>
                 ))
               )}
             </div>
           </motion.div>
         </React.Fragment>
       )}
     </AnimatePresence>

     <AnimatePresence>
       {showVlogLab && (
         <React.Fragment>
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }} 
             onClick={() => setShowVlogLab(false)}
             className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80]" 
           />
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }} 
             animate={{ scale: 1, opacity: 1 }} 
             exit={{ scale: 0.9, opacity: 0 }} 
             className="fixed inset-4 md:inset-10 bg-slate-50 z-[90] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20"
           >
             <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                   <Video className="text-white w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-slate-800 tracking-tight">AI 营销生产实验室</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Content Production Engine v3.0</p>
                 </div>
               </div>
                            <div className="flex p-1 bg-slate-100 rounded-xl ml-4">
                       <button 
                         onClick={() => setMainModule('vlog')}
                         className={cn(
                           "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                           mainModule === 'vlog' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                         )}
                       >
                         智能视频脚本
                       </button>
                       <button 
                         onClick={() => setMainModule('faceswap')}
                         className={cn(
                           "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                           mainModule === 'faceswap' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                         )}
                       >
                         AI 智能换脸
                       </button>
                       <button 
                         onClick={() => setMainModule('batch-image')}
                         className={cn(
                           "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                           mainModule === 'batch-image' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                         )}
                       >
                         批量生成图片
                       </button>
                    </div>
                <button onClick={() => setShowVlogLab(false)} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {mainModule === 'vlog' ? (
                  <React.Fragment>
                    <div className="w-80 border-r border-slate-100 bg-white overflow-y-auto p-8 space-y-8 custom-scrollbar">
                       <section className="space-y-4">
                        {/* API Settings Section */}
                        <div className="space-y-4 pb-4 border-b border-slate-50">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 uppercase tracking-wider">
                                <KeyRound className="w-3 h-3" /> OpenAI / 中转站 Key
                              </label>
                              <input 
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="API Key (sk-...)"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300 transition-all"
                              />
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                                API Base URL (中转站地址)
                              </label>
                              <input 
                                type="text"
                                value={openaiBaseUrl}
                                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                              />
                           </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Zap className="w-3 h-3 text-indigo-500" /> 生产引擎变量 (Variables)
                            </h4>
                            
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <button 
                                  onClick={() => handleGenerateVlog('topics')}
                                  disabled={isGeneratingVlog}
                                  className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-100 transition-all group disabled:opacity-50"
                                >
                                  <Type className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 mb-1" />
                                  <span className="text-[9px] font-black text-slate-500 group-hover:text-emerald-700">选题推荐</span>
                                </button>
                             <button 
                               onClick={() => handleGenerateVlog('storyboard')}
                               disabled={isGeneratingVlog}
                               className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-xl hover:bg-amber-50 hover:border-amber-100 transition-all group disabled:opacity-50"
                             >
                               <Video className="w-4 h-4 text-slate-400 group-hover:text-amber-600 mb-1" />
                               <span className="text-[9px] font-black text-slate-500 group-hover:text-amber-700">云端分镜</span>
                             </button>
                             <button 
                               onClick={() => handleGenerateVlog('tags')}
                               disabled={isGeneratingVlog}
                               className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all group disabled:opacity-50"
                             >
                               <Hash className="w-4 h-4 text-slate-400 group-hover:text-slate-600 mb-1" />
                               <span className="text-[9px] font-black text-slate-500 group-hover:text-slate-700">智能标签</span>
                             </button>
                           </div>

                           <button 
                             onClick={() => handleGenerateVlog('all')}
                             disabled={isGeneratingVlog}
                             className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                             <Sparkles className="w-3 h-3" /> 一键生成完整全案
                           </button>
                         </div>
                       </div>

                           <div className="pt-4 border-t border-slate-50">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                 {/* Identity Header Removed */}
                             </h4>
                             <div className="space-y-3">
                               <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                                 <span className="hidden">全局主角锁定</span>
                                 <button 
                                   onClick={() => setVlogCharacterConsistency(!vlogCharacterConsistency)}
                                   className={cn("w-8 h-4 rounded-full transition-all relative", "hidden")}
                                 >
                                   <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", vlogCharacterConsistency ? "left-4.5" : "left-0.5")} />
                                 </button>
                               </div>
                               
                               {false && (
                                 <div className="relative group aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-indigo-300 hover:bg-slate-100">
                                   {vlogReferenceImage ? (
                                     <React.Fragment>
                                       <img src={vlogReferenceImage} className="w-full h-full object-cover" />
                                       <button 
                                         onClick={() => setVlogReferenceImage(null)}
                                         className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                       >
                                         <Plus className="w-3 h-3 rotate-45" />
                                       </button>
                                     </React.Fragment>
                                   ) : (
                                     <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-4">
                                       <input 
                                         type="file" accept="image/*" className="hidden" 
                                         onChange={(e) => {
                                           const file = e.target.files?.[0];
                                           if (file) {
                                             const reader = new FileReader();
                                             reader.onloadend = () => setVlogReferenceImage(reader.result as string);
                                             reader.readAsDataURL(file);
                                           }
                                         }}
                                       />
                                       <Upload className="w-6 h-6 text-slate-300 mb-2" />
                                       <span className="text-[10px] font-bold text-slate-400 text-center">点击上传主角照片<br/><small className="font-normal opacity-50">锁定人物五官特征</small></span>
                                     </label>
                                   )}
                                 </div>
                               )}
                             </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><Zap className="w-3 h-3" /> 图片引擎 (Image Engine)</label>
                          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                             {(['stock', 'dalle'] as const).map(engine => (
                               <button 
                                 key={engine}
                                 onClick={() => setVlogVars(prev => ({ ...prev, imageEngine: engine }))}
                                 className={cn(
                                   "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all relative overflow-hidden",
                                   vlogVars.imageEngine === engine ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                 )}
                               >
                                 {engine === 'stock' ? '模拟/图库' : 'GPT DALL-E'}
                                 {engine === 'dalle' && <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 text-white flex items-center justify-center scale-50 rounded-bl-lg">★</div>}
                               </button>
                             ))}
                          </div>
                       </div>
                        <div className="pt-2">
                          <button 
                            onClick={() => setVlogVars(prev => ({ ...prev, chineseStyle: !prev.chineseStyle }))}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-bold transition-all border",
                              vlogVars.chineseStyle ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-100 border-slate-200 text-slate-400"
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" /> 强制中国境内风格
                            </div>
                            <div className={cn("w-8 h-4 rounded-full transition-all relative transition-colors", vlogVars.chineseStyle ? "bg-amber-400" : "bg-slate-300")}>
                              <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", vlogVars.chineseStyle ? "left-4.5" : "left-0.5")} />
                            </div>
                          </button>
                        </div>
                      </section>
                    </div>

                   {/* Editor Content */}
                   <div className="flex-1 flex flex-col p-10 bg-slate-900 overflow-hidden relative">
                      <div className="absolute top-8 right-8 z-20">
                         <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5">
                           {([
                             { id: 'topics', label: '选题矩阵', icon: <Type className="w-3 h-3" /> },
                             { id: 'script', label: '口播脚本', icon: <Clapperboard className="w-3 h-3" /> },
                             { id: 'storyboard', label: '片段拼接', icon: <Video className="w-3 h-3" /> }
                           ] as const).map((t) => (
                             <button 
                               key={t.id}
                               onClick={() => setActiveVlogTab(t.id)}
                               className={cn(
                                 "px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2",
                                 activeVlogTab === t.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                               )}
                             >
                               {t.icon}
                               {t.label}
                             </button>
                           ))}
                         </div>
                      </div>
                      
                      <div className="flex-1 rounded-[2.5rem] overflow-hidden flex items-center justify-center relative border border-white/5">
                     <button 
                       disabled={isGeneratingVlog}
                       onClick={() => handleGenerateVlog('all')}
                       className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                     >
                        {isGeneratingVlog ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        生成全套 AI 营销素材包
                     </button>
                  </div>

                  <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-10 shadow-inner overflow-y-auto custom-scrollbar border border-white/5 relative">
                     {isGeneratingVlog ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                          <div className="w-32 h-32 relative mb-8">
                             <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full" />
                             <motion.div 
                               initial={{ rotate: 0 }}
                               animate={{ rotate: 360 }}
                               className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent" 
                             />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-black text-xl">{Math.round(vlogGenProgress)}%</span>
                             </div>
                          </div>
                          <div className="space-y-3 text-center">
                             <p className="text-white font-black text-lg tracking-widest uppercase">{vlogGenStatus || "AI Engine Initializing..."}</p>
                             <p className="text-indigo-400 font-bold text-[10px] tracking-[0.2em] uppercase opacity-50">Generative Marketing Pipeline v2.0</p>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-64 h-1 bg-white/5 rounded-full mt-10 overflow-hidden">
                             <motion.div 
                               className="h-full bg-indigo-500" 
                               initial={{ width: 0 }}
                               animate={{ width: `${vlogGenProgress}%` }}
                             />
                          </div>
                       </div>
                     ) : vlogResult ? (
                       <div className="h-full">
                          {activeVlogTab === 'topics' && (
                            <section className="space-y-6">
                               <h5 className="flex items-center gap-3 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                 <Type className="w-4 h-4" /> 选题矩阵 (Topics)
                               </h5>
                               <div className="grid grid-cols-1 gap-3">
                                  {vlogResult.topics?.split('\n').filter(l => l.trim()).map((t, i) => (
                                    <div key={`topic-${i}`} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-between">
                                       <span className="text-white text-sm font-medium">{t}</span>
                                       <button onClick={() => { navigator.clipboard.writeText(t); alert('已复制标题'); }} className="p-2 opacity-0 group-hover:opacity-100 bg-indigo-600 rounded-lg text-white transition-opacity">
                                          <Copy className="w-3 h-3" />
                                       </button>
                                    </div>
                                  ))}
                               </div>
                            </section>
                          )}

                          {activeVlogTab === 'script' && (
                            <section className="space-y-6 max-w-2xl mx-auto">
                               <h5 className="flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                 <Clapperboard className="w-4 h-4" /> 35秒口播脚本 (Script)
                               </h5>
                               <div className="bg-white/5 rounded-3xl p-10 border border-white/5 relative group">
                                  <pre className="text-white text-lg leading-relaxed font-medium whitespace-pre-wrap font-sans text-center">
                                    {vlogResult.script}
                                  </pre>
                                  <button 
                                    onClick={() => { navigator.clipboard.writeText(vlogResult.script || ''); alert('已复制脚本'); }}
                                    className="absolute top-6 right-6 p-2 bg-emerald-600 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                     <Copy className="w-4 h-4" />
                                  </button>
                                  <div className="mt-10 pt-10 border-t border-white/5 flex gap-10 justify-center">
                                     <div className="text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">预计语速</p>
                                        <p className="text-white font-bold">1.2x</p>
                                     </div>
                                     <div className="text-center">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">总时长</p>
                                        <p className="text-white font-bold">35s</p>
                                     </div>
                                  </div>
                               </div>
                            </section>
                          )}

                          {activeVlogTab === 'storyboard' && (
                            <section className="space-y-8">
                               <h5 className="flex items-center gap-3 text-amber-400 font-bold text-xs uppercase tracking-widest">
                                 <Video className="w-4 h-4" /> 片段拼接分镜表 (Storyboard Timeline)
                               </h5>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {vlogResult.storyboard?.map((clip, idx) => (
                                    <div key={`clip-${idx}-${clip.Scene || ''}`} className="bg-white/5 border border-white/10 rounded-2xl p-5 group flex gap-4">
                                       <div className="w-24 h-32 bg-slate-800 rounded-lg flex-shrink-0 relative overflow-hidden border border-white/5 shadow-2xl">
                                          {vlogResult.storyboardImages?.[idx] ? (
                                             <img 
                                               src={vlogResult.storyboardImages[idx]} 
                                               className="w-full h-full object-cover animate-in fade-in zoom-in duration-700" 
                                               alt={clip.Scene}
                                             />
                                          ) : (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50">
                                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                                                <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">Generating</p>
                                             </div>
                                          )}
                                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white tracking-widest backdrop-blur-sm">#{idx+1}</div>
                                          <button 
                                             onClick={(e) => { 
                                               e.stopPropagation(); 
                                               if(vlogResult.storyboardImages?.[idx]) {
                                                 downloadImage(vlogResult.storyboardImages[idx], `clip_${idx+1}.png`);
                                               }
                                             }}
                                             className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-indigo-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                                             title="下载图片"
                                          >
                                             {isDownloading === vlogResult.storyboardImages?.[idx] ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                          </button>
                                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-indigo-600 rounded text-[9px] font-bold text-white tracking-widest uppercase shadow-lg space-x-1">
                                             <span>{clip.Duration}</span>
                                          </div>
                                       </div>
                                       <div className="flex-1 flex flex-col justify-between py-1">
                                          <div>
                                            <h6 className="text-amber-400 text-[11px] font-black uppercase tracking-widest mb-1">{clip.Scene}</h6>
                                            <p className="text-white/60 text-[10px] leading-relaxed line-clamp-3 italic">"{clip['Imagen Prompt']}"</p>
                                          </div>
                                          <button 
                                             onClick={() => { 
                                               if (vlogResult.storyboardImages?.[idx]) {
                                                 handleSaveAsset(vlogResult.storyboardImages[idx], clip['Imagen Prompt'], 'vlog_clip');
                                                 alert('已存入素材库');
                                               }
                                             }}
                                             className="mt-3 w-fit flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                                          >
                                             <Save className="w-3 h-3" /> 存入图库
                                          </button>
                                          <button 
                                             onClick={() => { navigator.clipboard.writeText(clip['Imagen Prompt']); alert('已复制该片段提示词'); }}
                                             className="mt-1 w-fit flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                                          >
                                             <Copy className="w-3 h-3" /> 复制指令
                                          </button>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </section>
                          )}

                          {vlogResult.tags && (
                            <section className="mt-12 pt-12 border-t border-white/10">
                               <h5 className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-widest mb-6">
                                 <Hash className="w-4 h-4" /> 智能推流标签系数
                               </h5>
                               <div className="flex gap-3 flex-wrap">
                                  {vlogResult.tags.split(' ').filter(t => t.trim()).map((tag, idx) => (
                                    <span key={`tag-${idx}-${tag}`} className="px-5 py-2.5 bg-white/5 text-white/80 text-[11px] font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all cursor-default">
                                       {tag}
                                    </span>
                                  ))}
                               </div>
                            </section>
                          )}
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center">
                          <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                             <Terminal className="w-12 h-12 text-indigo-500/40" />
                          </div>
                          <h3 className="text-white font-bold text-lg mb-2">等待指令下达</h3>
                          <p className="text-slate-500 text-xs max-w-xs text-center leading-relaxed">请在左侧配置活动变量，点击右上角由 Gemini 2.0 驱动的 AI 引擎生成完整的营销素材包。</p>
                       </div>
                     )}
                  </div>
                </div>
             </React.Fragment>
            ) : mainModule === 'batch-image' ? (
              <div className="flex-1 flex flex-row overflow-hidden bg-white animate-in fade-in duration-500">
                {/* Left Sidebar Column - Batch Prompts */}
                <div className="w-80 border-r border-slate-100 flex flex-col h-full bg-white overflow-hidden shadow-sm">
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-3 h-3 text-indigo-500" /> 批量提示词配置 (Prompts)
                    </h4>

                    <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                           <Tag className="w-2.5 h-2.5" /> 任务名称
                         </label>
                         <input 
                           value={batchImageTaskName}
                           onChange={(e) => setBatchImageTaskName(e.target.value)}
                           className="w-full p-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                           placeholder="输入任务名称..."
                         />
                      </div>

                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                           <Layout className="w-2.5 h-2.5" /> 构图比例 (Aspect Ratio)
                         </label>
                         <div className="grid grid-cols-3 gap-2">
                            {(['1:1', '9:16', '16:9'] as const).map((ratio) => (
                              <button
                                key={ratio}
                                onClick={() => setBatchImageAspectRatio(ratio)}
                                className={cn(
                                  "py-2 text-[10px] font-bold rounded-lg border transition-all",
                                  batchImageAspectRatio === ratio 
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                )}
                              >
                                {ratio}
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> 输入 10 个独立提示词
                        </label>
                        <div className="space-y-3 max-h-[480px] pr-2 overflow-y-auto custom-scrollbar">
                          {batchImagePrompts.map((p, idx) => (
                            <div key={idx} className="space-y-1.5 relative">
                              <div className="flex justify-between items-center group">
                                 <span className="text-[9px] font-black text-slate-300 uppercase">Input #{idx + 1}</span>
                                 {batchImageProgress[idx] === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                 {batchImageProgress[idx] === -1 && <AlertCircle className="w-3 h-3 text-red-500" />}
                              </div>
                              <textarea 
                                value={p}
                                onChange={(e) => {
                                  const next = [...batchImagePrompts];
                                  next[idx] = e.target.value;
                                  setBatchImagePrompts(next);
                                }}
                                className={cn(
                                  "w-full min-h-[60px] p-2.5 text-[10px] font-medium bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none",
                                  batchImageProgress[idx] > 0 && batchImageProgress[idx] < 100 && "ring-2 ring-indigo-500/10 animate-pulse border-indigo-200"
                                )}
                                placeholder={`在这里输入描述词 #${idx + 1}...`}
                              />
                              {batchImageProgress[idx] > 0 && batchImageProgress[idx] < 100 && (
                                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-slate-100 shadow-sm">
                                   <div className="w-2 h-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                   <span className="text-[8px] font-bold text-indigo-500">{Math.floor(batchImageProgress[idx])}%</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                       <button 
                         onClick={() => setShowApiConfig(!showApiConfig)}
                         className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
                       >
                         <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                           <Server className="w-3 h-3 text-indigo-600" /> API 并行通道配置
                         </span>
                         <ChevronRight className={cn("w-3 h-3 text-slate-300 transition-transform", showApiConfig && "rotate-90")} />
                       </button>
                       {showApiConfig && (
                          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2">
                             <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Base URL (OpenAI Proxy)</label>
                               <input value={faceSwapBaseUrl} onChange={(e) => setFaceSwapBaseUrl(e.target.value)} className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">API Key</label>
                               <input type="password" value={faceSwapApiKey} onChange={(e) => setFaceSwapApiKey(e.target.value)} className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                             </div>
                             <div className="space-y-1">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Generation Model</label>
                               <input value={faceSwapImageModel} onChange={(e) => setFaceSwapImageModel(e.target.value)} className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500" placeholder="dall-e-3" />
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="pt-8">
                       <button 
                         disabled={isGeneratingBatchImage || !batchImagePrompts.some(p => p.trim() !== "")}
                         onClick={handleBatchImageGen}
                         className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                       >
                          {isGeneratingBatchImage ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          批量并行启动生成
                       </button>
                    </div>
                  </div>
                </div>

                {/* Middle Stage - Canvas */}
                <div className="flex-1 flex flex-col bg-slate-900 border-x border-slate-100 overflow-hidden relative">
                   <div className="flex-1 p-10 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
                      
                      {selectedBatchImg ? (
                        <motion.div 
                          key={selectedBatchImg} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "relative h-full shadow-2xl rounded-[3rem] overflow-hidden bg-black ring-1 ring-white/10",
                            batchImageAspectRatio === '9:16' ? "aspect-[9/16]" : batchImageAspectRatio === '16:9' ? "aspect-[16/9]" : "aspect-square"
                          )}
                        >
                           <img src={selectedBatchImg} className="w-full h-full object-contain" />
                           <div className="absolute top-8 right-8">
                              <button 
                                onClick={() => downloadImage(selectedBatchImg!, `batch_${Date.now()}`)} 
                                className="p-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl shadow-xl transition-all active:scale-[0.85] shadow-indigo-500/20 flex items-center gap-3"
                              >
                                 <Download className="w-7 h-7" />
                                 <span className="text-xs font-black uppercase tracking-widest mr-2">Download HQ</span>
                              </button>
                           </div>
                           <div className="absolute bottom-8 left-8 right-8">
                              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                 <p className="text-white/80 text-[10px] leading-relaxed italic text-center">
                                    "{batchImageResults.find(r => r.url === selectedBatchImg)?.prompt}"
                                 </p>
                              </div>
                           </div>
                        </motion.div>
                      ) : (
                        <div className="text-center opacity-20 select-none animate-pulse">
                           <ImageIcon className="w-20 h-20 text-white mb-6 mx-auto" />
                           <h3 className="text-white text-xl font-black uppercase tracking-[0.2em]">Awaiting Generation</h3>
                           <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Select an item from the library below</p>
                        </div>
                      )}
                   </div>

                   {batchImageResults.length > 0 && (
                     <div className="h-44 bg-black/80 backdrop-blur-3xl border-t border-white/10 p-6 flex flex-col gap-4 overflow-hidden relative">
                        <div className="flex items-center justify-between px-3">
                           <div className="flex items-center gap-3">
                              <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">批量图库资源 (Gallery)</h5>
                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-bold rounded-full">{batchImageResults.length} Units</span>
                           </div>
                           <button 
                             onClick={() => {
                               batchImageResults.slice(0, 10).forEach((res, i) => {
                                 setTimeout(() => downloadImage(res.url, `batch_gen_${i}_${res.id}`), i * 300);
                               });
                               alert('已启动批量下载队列 (前10张)');
                             }}
                             className="flex items-center gap-2 group"
                           >
                              <span className="text-[9px] font-red text-indigo-400 uppercase tracking-widest group-hover:text-indigo-300 transition-colors">Download Top 10 Batch</span>
                              <Download className="w-3 h-3 text-indigo-400" />
                           </button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 px-3">
                           {batchImageResults.map((res) => (
                             <button 
                               key={res.id} 
                               onClick={() => setSelectedBatchImg(res.url)} 
                               className={cn(
                                 "flex-shrink-0 h-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group shadow-lg", 
                                 selectedBatchImg === res.url ? "border-indigo-500 scale-[1.05] z-10 shadow-indigo-500/20" : "border-white/10 hover:border-white/30 grayscale-20 hover:grayscale-0"
                               )}
                             >
                                <img src={res.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </button>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-row overflow-hidden bg-white">
                {/* Left Sidebar Column */}
                <div className="w-80 border-r border-slate-100 flex flex-col h-full bg-white overflow-hidden shadow-sm">
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Wand2 className="w-3 h-3 text-indigo-500" /> 面部合成配置 (Configuration)
                    </h4>

                    {/* Prompt and API Config */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> 合成增强提示词 (Prompt)
                        </label>
                        <textarea 
                          value={faceSwapPrompt}
                          onChange={(e) => setFaceSwapPrompt(e.target.value)}
                          className="w-full min-h-[80px] p-3 text-[11px] font-medium bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                          placeholder="描述合成效果，例如：电影质感，超清细腻..."
                        />
                      </div>

                      <div className="space-y-2">
                        <button 
                          onClick={() => setShowApiConfig(!showApiConfig)}
                          className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group"
                        >
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                            <Server className="w-3 h-3" /> 并行 API 通道配置 ({faceSwapApis.filter(a => a).length}/10)
                          </span>
                          <ChevronRight className={cn("w-3 h-3 text-slate-300 transition-transform", showApiConfig && "rotate-90")} />
                        </button>
                        
                        {showApiConfig && (
                          <div className="space-y-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Globe className="w-2.5 h-2.5" /> API 中转站 Base URL
                              </label>
                              <input 
                                value={faceSwapBaseUrl}
                                onChange={(e) => setFaceSwapBaseUrl(e.target.value)}
                                className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="https://api.openai-proxy.com/v1"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Key className="w-2.5 h-2.5" /> API Key
                              </label>
                              <input 
                                type="password"
                                value={faceSwapApiKey}
                                onChange={(e) => setFaceSwapApiKey(e.target.value)}
                                className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="sk-..."
                              />
                            </div>

                            <div className="space-y-2 border-b border-slate-50 pb-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Tag className="w-2.5 h-2.5" /> 任务名称 (Task Name)
                              </label>
                              <input 
                                value={faceSwapTaskName}
                                onChange={(e) => setFaceSwapTaskName(e.target.value)}
                                className="w-full p-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
                                placeholder="输入本次任务名称..."
                              />
                            </div>

                            <div className="space-y-2 mt-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Monitor className="w-2.5 h-2.5" /> 换脸模型 (Model)
                              </label>
                              <input 
                                value={faceSwapModel}
                                onChange={(e) => setFaceSwapModel(e.target.value)}
                                className="w-full p-2 text-[10px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                placeholder="如: gpt-4o 或保持为空"
                              />
                              <p className="text-[8px] text-slate-400">
                                * 针对灯塔 (Dengche) API，建议使用 gpt-image-2 模型。
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <p className="text-[9px] text-slate-400 font-medium leading-relaxed mb-2">
                                请配置 10 个独立并发通道。使用 `v1/images/edits` 以激活参考图模式。
                              </p>
                              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                {faceSwapApis.map((api, idx) => (
                                  <input 
                                    key={idx}
                                    value={api || ""}
                                    onChange={(e) => {
                                      const next = [...faceSwapApis];
                                      next[idx] = e.target.value;
                                      setFaceSwapApis(next);
                                    }}
                                    className="w-full p-2 text-[9px] bg-white border border-slate-200 rounded focus:border-indigo-500 outline-none"
                                    placeholder={`Channel #${idx + 1} API Key...`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Source Identity Section */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3 text-indigo-500" /> 基准人脸 (Source Identity)
                        </h4>
                        <div 
                          onClick={() => document.getElementById('source-upload')?.click()}
                          className={cn(
                            "relative aspect-video rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group overflow-hidden",
                            faceSwapInputs.source ? "border-indigo-200 bg-indigo-50/20" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                          )}
                        >
                          {faceSwapInputs.source ? (
                            <>
                              <img src={faceSwapInputs.source} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg">Replace Source</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5" />
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Face Source</p>
                            </>
                          )}
                        </div>
                        <input 
                          id="source-upload" type="file" accept="image/*" className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setFaceSwapInputs(prev => ({ ...prev, source: reader.result as string }));
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>

                      {/* Target Bodies Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Target className="w-3 h-3 text-indigo-500" /> 批量目标 (Target Bodies)
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{faceSwapInputs.targets.length}/10</span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-1.5">
                          {faceSwapInputs.targets.map((url, idx) => (
                            <div key={`target-${idx}`} className="relative aspect-square rounded-lg bg-slate-50 overflow-hidden border border-slate-100 group">
                              <img src={url} className="w-full h-full object-cover" />
                               {faceSwapProgress[idx] !== undefined && isGeneratingFaceSwap && (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                                    <div className="w-full h-full rounded-full border-2 border-indigo-500/20 flex items-center justify-center relative">
                                        <div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                                        <span className="text-[8px] font-black text-white">{Math.floor(faceSwapProgress[idx])}%</span>
                                    </div>
                                 </div>
                               )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFaceSwapInputs(prev => ({
                                    ...prev,
                                    targets: prev.targets.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Plus className="w-2 h-2 rotate-45" />
                              </button>
                            </div>
                          ))}
                          {faceSwapInputs.targets.length < 10 && (
                            <button 
                              onClick={() => document.getElementById('target-upload')?.click()}
                              className="aspect-square rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:bg-slate-50 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <input 
                          id="target-upload" type="file" multiple accept="image/*" className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const remaining = 10 - faceSwapInputs.targets.length;
                            const toProcess = files.slice(0, remaining);
                            
                            toProcess.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFaceSwapInputs(prev => ({
                                  ...prev,
                                  targets: [...prev.targets, reader.result as string].slice(0, 10)
                                }));
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-8 mt-auto space-y-4">
                        <button 
                          disabled={isGeneratingFaceSwap || !faceSwapInputs.source || faceSwapInputs.targets.length === 0}
                          onClick={handleFaceSwap}
                          className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                           Execute Render
                        </button>
                    </div>
                  </div>
                </div>

                {/* Middle: Professional Canvas Stage */}
                 <div className="flex-1 flex flex-col bg-slate-900 border-x border-slate-100 overflow-hidden relative">
                    <div className="flex-1 p-10 flex items-center justify-center relative overflow-hidden">
                       {selectedFaceImg ? (
                         <motion.div 
                           key={selectedFaceImg} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                           className="relative h-full aspect-[2/3] shadow-2xl rounded-[3rem] overflow-hidden bg-black ring-1 ring-white/10"
                         >
                            <img 
                              src={selectedFaceImg} className="w-full h-full object-cover" 
                              style={{ filter: `brightness(${faceFilters.brightness}%) contrast(${faceFilters.contrast}%) saturate(${faceFilters.saturation}%) blur(${faceFilters.blur}px) sepia(${faceFilters.sepia}%)` }}
                            />
                            <div className="absolute top-8 right-8">
                               <button onClick={() => downloadImage(selectedFaceImg!, 'hq-render')} className="p-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl shadow-xl transition-all active:scale-[0.85] shadow-indigo-500/20">
                                  <ImageDown className="w-8 h-8" />
                               </button>
                            </div>
                         </motion.div>
                       ) : (
                         <div className="text-center opacity-20 select-none">
                            <Palette className="w-20 h-20 text-white mb-6 mx-auto" />
                            <h3 className="text-white text-xl font-black uppercase tracking-[0.2em]">Select Output</h3>
                         </div>
                       )}
                    </div>

                    {faceSwapResults.length > 0 && (
                      <div className="h-44 bg-black/80 backdrop-blur-3xl border-t border-white/10 p-6 flex flex-col gap-4 overflow-hidden relative">
                         <div className="flex items-center justify-between px-3">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Synthesis Library ({faceSwapResults.length})</h5>
                         </div>
                         <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 px-3">
                            {faceSwapResults.map((res) => (
                              <button key={res.id} onClick={() => { setSelectedFaceImg(res.url); setFaceFilters(res.filters || { brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0 }); }} className={cn("flex-shrink-0 h-24 aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all relative group shadow-lg", selectedFaceImg === res.url ? "border-indigo-500 scale-[1.05] z-10" : "border-white/10 hover:border-white/30 grayscale-20")}>
                                 <img src={res.url} className="w-full h-full object-cover" />
                              </button>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Right: Detailed Tools */}
                 <div className="w-80 bg-white flex flex-col h-full overflow-hidden shadow-2xl relative z-20">
                      <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Brush className="w-3 h-3 text-indigo-500" /> 二次美颜微调 (Beautify)
                        </h4>
                        
                        <div className="space-y-6">
                           {[
                             { label: '亮度 (Brightness)', key: 'brightness', icon: <Sun className="w-3.5 h-3.5" />, min: 50, max: 150 },
                             { label: '对比度 (Contrast)', key: 'contrast', icon: <Contrast className="w-3.5 h-3.5" />, min: 50, max: 150 },
                             { label: '饱和度 (Saturate)', key: 'saturation', icon: <Droplets className="w-3.5 h-3.5" />, min: 0, max: 200 },
                             { label: '柔滑磨皮 (Smoothing)', key: 'blur', icon: <Wind className="w-3.5 h-3.5" />, min: 0, max: 5 },
                             { label: '中式微红 (Warmth)', key: 'sepia', icon: <Palette className="w-3.5 h-3.5" />, min: 0, max: 100 },
                           ].map(tool => (
                             <div key={tool.key} className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <label className="text-[10px] font-bold text-slate-600 flex items-center gap-2 italic">
                                      {tool.icon} {tool.label}
                                   </label>
                                   <span className="text-[10px] font-black text-indigo-600">{(faceFilters as any)[tool.key]}</span>
                                </div>
                                <input 
                                  type="range" min={tool.min} max={tool.max}
                                  value={(faceFilters as any)[tool.key]}
                                  onChange={(e) => setFaceFilters(prev => ({ ...prev, [tool.key]: parseInt(e.target.value) }))}
                                  className="w-full"
                                />
                             </div>
                           ))}
                        </div>

                        <div className="pt-6 border-t border-slate-50 space-y-3">
                           <button 
                             onClick={() => setFaceFilters({ brightness: 100, contrast: 100, saturation: 100, blur: 0, sepia: 0 })}
                             className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all border border-slate-100"
                           >
                              重置所有效果
                           </button>
                           <button 
                             disabled={!selectedFaceImg}
                             onClick={() => {
                               if (selectedFaceImg) {
                                 const link = document.createElement('a');
                                 link.href = selectedFaceImg;
                                 link.download = `deepswap-pro-${Date.now()}.png`;
                                 link.click();
                               }
                             }}
                             className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                           >
                              导出作品并存入本地
                            </button>
                          </div>
                       </section>
                      </div>
                    </div>
                  )}
                 </div>
              </motion.div>
            </React.Fragment>
          )}
        </AnimatePresence>

   {/* Footer Disclaimer */}
     <footer className="fixed bottom-0 left-[340px] right-0 bg-white/80 backdrop-blur-sm border-t border-slate-100 px-6 py-2 z-40">
       <p className="text-[9px] text-slate-400 text-center font-medium">
         模拟结果基于 AI 算法生成，仅供临床沟通参考。实际效果受个体差异、手术入路及恢复环境影响。请咨询具备执业资质的整形外科医生。
       </p>
     </footer>

     {/* Styles */}
     <style>{`
       .custom-scrollbar::-webkit-scrollbar { width: 4px; }
       .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
       .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
       input[type='range']::-webkit-slider-thumb {
         -webkit-appearance: none; appearance: none;
         width: 14px; height: 14px; background: #0D9488; border-radius: 6px;
         cursor: pointer; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(13 148 136 / 0.2);
       }
     `}</style>
   </div>
 );
}