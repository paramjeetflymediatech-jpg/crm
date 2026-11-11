import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private var privacyShieldView: UIView?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if let filePath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let options = FirebaseOptions(contentsOfFile: filePath) {
      FirebaseApp.configure(options: options)
    } else {
      print("[Firebase] Notice: GoogleService-Info.plist not found in app bundle. Skipping FirebaseApp.configure().")
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "crm",
      in: window,
      launchOptions: launchOptions
    )

    setupScreenSecurityObservers()

    return true
  }

  // MARK: - Screen Security & Anti-Screenshot Protection

  private func setupScreenSecurityObservers() {
    // 1. Detect Screen Recording / AirPlay Mirroring
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleScreenCaptureChange),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )

    // 2. Detect Screenshot Attempt
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleUserTookScreenshot),
      name: UIApplication.userDidTakeScreenshotNotification,
      object: nil
    )
  }

  func applicationWillResignActive(_ application: UIApplication) {
    // Obscure app contents when moving to app switcher / multitasking
    showPrivacyShield()
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    // Restore display only if screen recording is not active
    if !UIScreen.main.isCaptured {
      hidePrivacyShield()
    }
  }

  @objc private func handleScreenCaptureChange() {
    DispatchQueue.main.async {
      if UIScreen.main.isCaptured {
        self.showPrivacyShield()
      } else if UIApplication.shared.applicationState == .active {
        self.hidePrivacyShield()
      }
    }
  }

  @objc private func handleUserTookScreenshot() {
    DispatchQueue.main.async {
      let alert = UIAlertController(
        title: "Security Notice",
        message: "Screenshots of confidential CRM data are prohibited by organization security policy.",
        preferredStyle: .alert
      )
      alert.addAction(UIAlertAction(title: "OK", style: .default))
      self.window?.rootViewController?.present(alert, animated: true)
    }
  }

  private func showPrivacyShield() {
    guard privacyShieldView == nil, let window = self.window else { return }

    let blurEffect = UIBlurEffect(style: .systemMaterialDark)
    let blurEffectView = UIVisualEffectView(effect: blurEffect)
    blurEffectView.frame = window.bounds
    blurEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    blurEffectView.tag = 9999

    let label = UILabel()
    label.text = "Protected CRM Screen"
    label.textColor = .white
    label.font = UIFont.boldSystemFont(ofSize: 18)
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false

    blurEffectView.contentView.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: blurEffectView.contentView.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: blurEffectView.contentView.centerYAnchor)
    ])

    window.addSubview(blurEffectView)
    window.bringSubviewToFront(blurEffectView)
    privacyShieldView = blurEffectView
  }

  private func hidePrivacyShield() {
    privacyShieldView?.removeFromSuperview()
    privacyShieldView = nil
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
