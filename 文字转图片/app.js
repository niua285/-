const _originRequire = require;

require = function(path) {
  console.log('[DEBUG] Requiring:', path);
  try {
    return _originRequire(path);
  } catch (e) {
    console.error('[DEBUG] Require失败:', e);
    wx.showToast({ title: `模块加载失败: ${path}`, icon: 'none' });
    throw e;
  }
};

App({
  onLaunch() {
    // 输出运行环境信息
    console.log('运行环境信息:', {
      SDKVersion: wx.getSystemInfoSync().SDKVersion,
      platform: wx.getSystemInfoSync().platform,
      libVersion: __wxConfig.libVersion
    });
    console.log('小程序初始化完成');
  },

  onShow(options) {
    // 小程序启动或从后台进入前台时触发
    console.log('小程序显示');
  },

  onHide() {
    // 小程序从前台进入后台时触发
    console.log('小程序隐藏');
  },

  globalData: {
    // 全局共享数据
    userInfo: null
  }
});