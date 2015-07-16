var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

(function (global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory(require("bluebird"), require("path"), require("fs-promise"), require("temp"), require("dot"), require("child_process"), require("jsonfile"), require("asar")) : typeof define === "function" && define.amd ? define(["bluebird", "path", "fs-promise", "temp", "dot", "child_process", "jsonfile", "asar"], factory) : global.MyLibrary = factory(global.bluebird, global.path, global.fs, global.temp, global.dot, global.ChildProcess, global.jf, global.asar);
})(this, function (bluebird, path, fs, temp, dot, ChildProcess, jf, asar) {
	"use strict";

	"use strict";

	var Util = {
		isEmpty: function isEmpty(str) {
			return !str || str.length === 0;
		},
		exec: function exec(cmd, args, options) {
			return new bluebird(function (resolve, reject) {
				ChildProcess.execFile(cmd, args, options, function (error, stdout, stderr) {
					if (error) {
						reject(new Error("Command\n" + cmd + " " + args + "\n returned non-zero code " + error + " with error output " + stderr));
					} else {
						resolve(stdout);
					}
				});
			});
		},
		getPackageJson: function getPackageJson(appDirectory) {
			try {
				return jf.readFileSync(path.resolve(appDirectory, "resources", "app", "package.json"));
			} catch (error) {
				try {
					return JSON.parse(asar.extractFile(path.resolve(appDirectory, "resources", "app.asar"), "package.json"));
				} catch (error) {
					throw new Error("Neither resources/app folder nor resources/app.asar package were found.");
				}
			}
		}
	};

	"use strict";

	var InstallerFactory = (function () {
		function InstallerFactory() {
			var _ref = arguments[0] === undefined ? {} : arguments[0];

			var appDirectory = _ref.appDirectory;
			var _ref$outputDirectory = _ref.outputDirectory;
			var outputDirectory = _ref$outputDirectory === undefined ? "installer" : _ref$outputDirectory;
			var _ref$loadingGif = _ref.loadingGif;
			var loadingGif = _ref$loadingGif === undefined ? path.resolve(__dirname, "..", "resources", "install-spinner.gif") : _ref$loadingGif;
			var authors = _ref.authors;
			var owners = _ref.owners;
			var exe = _ref.exe;
			var _ref$iconUrl = _ref.iconUrl;
			var iconUrl = _ref$iconUrl === undefined ? "https://raw.githubusercontent.com/atom/atom-shell/master/atom/browser/resources/win/atom.ico" : _ref$iconUrl;
			var description = _ref.description;
			var version = _ref.version;
			var title = _ref.title;
			var certificateFile = _ref.certificateFile;
			var certificatePassword = _ref.certificatePassword;
			var signWithParams = _ref.signWithParams;
			var setupIcon = _ref.setupIcon;
			var remoteReleases = _ref.remoteReleases;

			_classCallCheck(this, InstallerFactory);

			if (Util.isEmpty(appDirectory)) {
				throw new Error("Please provide \"appDirectory\" config parameter.");
			}

			try {
				var appMetadata = Util.getPackageJson(appDirectory);
				this.appDirectory = appDirectory;
				this.outputDirectory = path.resolve(outputDirectory);
				this.loadingGif = path.resolve(loadingGif);
				this.authors = authors || appMetadata.author || "";
				this.owners = owners || this.authors;
				this.name = appMetadata.name;
				this.exe = exe || this.name;
				this.iconUrl = iconUrl;
				this.description = description || appMetadata.description;
				this.version = version || appMetadata.version;
				this.productName = appMetadata.productName || this.name;
				this.title = title || this.productName || this.name;
				this.certificateFile = certificateFile;
				this.certificatePassword = certificatePassword;
				this.signWithParams = signWithParams;
				this.setupIcon = setupIcon;
				this.remoteReleases = remoteReleases;
			} catch (error) {
				throw error;
			}
		}

		_createClass(InstallerFactory, {
			syncReleases: {
				value: function syncReleases() {
					if (this.remoteReleases) {
						var cmd = path.resolve(__dirname, "..", "vendor", "SyncReleases.exe");
						var args = ["-u", this.remoteReleases, "-r", this.outputDirectory];
						return Util.exec(cmd, args);
					} else {
						return bluebird.resolve();
					}
				}
			},
			update: {
				value: function update(nugetOutput) {
					var nupkgPath = path.join(nugetOutput, "" + this.name + "." + this.version + ".nupkg");
					var cmd = path.resolve(__dirname, "..", "vendor", "Update.com");
					var args = ["--releasify", nupkgPath, "--releaseDir", this.outputDirectory, "--loadingGif", this.loadingGif];

					if (this.signWithParams) {
						args.push("--signWithParams");
						args.push(this.signWithParams);
					} else if (this.certificateFile && this.certificatePassword) {
						args.push("--signWithParams");
						args.push("/a /f \"" + path.resolve(this.certificateFile) + "\" /p \"" + this.certificatePassword + "\"");
					}

					if (this.setupIcon) {
						var setupIconPath = path.resolve(this.setupIcon);
						args.push("--setupIcon");
						args.push(setupIconPath);
					}

					return Util.exec(cmd, args);
				}
			},
			updateSetupFile: {
				value: function updateSetupFile() {
					if (this.productName) {
						var setupPath = path.join(this.outputDirectory, "" + this.productName + "Setup.exe");
						fs.renameSync(path.join(this.outputDirectory, "Setup.exe"), setupPath);
					}

					return bluebird.resolve();
				}
			},
			createInstaller: {
				value: function createInstaller() {
					var _this = this;

					// Start tracking temporary directories
					temp.track();

					// Bundle Update.exe with the app
					fs.copySync(path.resolve(__dirname, "..", "vendor", "Update.exe"), path.join(this.appDirectory, "Update.exe"));

					// Read the contents of template.nuspec file
					var template = dot.template(fs.readFileSync(path.resolve(__dirname, "..", "resources", "template.nuspec")));

					// Fill the template with provided configuration parameters
					var nuspecContent = template({
						name: this.name,
						title: this.title,
						version: this.version,
						authors: this.authors,
						owners: this.owners,
						iconUrl: this.iconUrl,
						description: this.description,
						exe: this.exe
					});

					// Create temporary directory for the installer
					var nugetOutput = temp.mkdirSync("squirrel-installer-");
					var targetNuspecPath = path.join(nugetOutput, "" + this.name + ".nuspec");
					fs.writeFileSync(targetNuspecPath, nuspecContent);

					var cmd = path.resolve(__dirname, "..", "vendor", "nuget.exe");
					var args = ["pack", targetNuspecPath, "-BasePath", path.resolve(this.appDirectory), "-OutputDirectory", nugetOutput, "-NoDefaultExcludes"];

					if (process.platform !== "win32") {
						args.unshift(cmd);
						cmd = "wine";
					}

					return Util.exec(cmd, args).then(function () {
						return _this.syncReleases();
					}).then(function () {
						return _this.update(nugetOutput);
					}).then(function () {
						return _this.updateSetupFile();
					});
				}
			}
		});

		return InstallerFactory;
	})();

	var _InstallerFactory = InstallerFactory;

	"use strict";

	var index = function (opts) {
		try {
			var installerFactory = new _InstallerFactory(opts);
			return installerFactory.createInstaller();
		} catch (error) {
			return bluebird.reject(error);
		}
	};

	return index;
});
//# sourceMappingURL=./library-dist.js.map