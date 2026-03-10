# CODE VERIFIED
{
  description = "Nix flake wrapper for the superpowers-hardened CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }: let
    agentPackage = builtins.fromJSON (builtins.readFile ./.agents/package.json);
  in
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
      lib = pkgs.lib;

      version = agentPackage.version;

      superpowersRepo = pkgs.stdenvNoCC.mkDerivation {
        pname = "superpowers-hardened-repo";
        inherit version;
        src = lib.cleanSource ./.;
        dontBuild = true;
        installPhase = ''
          runHook preInstall

          mkdir -p "$out/share/superpowers-hardened"
          cp -R . "$out/share/superpowers-hardened/"

          runHook postInstall
        '';
      };

      packagedRepoPath = "${superpowersRepo}/share/superpowers-hardened";

      superpowersAgent = pkgs.writeShellApplication {
        name = "superpowers-agent";
        runtimeInputs = [
          pkgs.git
          pkgs.nodejs
        ];
        text = ''
          set -euo pipefail

          repo_path="''${SUPERPOWERS_REPO:-}"

          if [ -z "$repo_path" ] && [ -f "$PWD/.agents/superpowers-agent" ]; then
            repo_path="$PWD"
          fi

          if [ -z "$repo_path" ]; then
            repo_path="${packagedRepoPath}"
          fi

          if [ ! -f "$repo_path/.agents/superpowers-agent" ]; then
            echo "superpowers-agent entrypoint not found under: $repo_path" >&2
            exit 1
          fi

          export SUPERPOWERS_REPO="$repo_path"
          exec ${lib.getExe pkgs.nodejs} "$repo_path/.agents/superpowers-agent" "$@"
        '';
      };

      superpowers = pkgs.writeShellApplication {
        name = "superpowers";
        text = ''
          set -euo pipefail
          exec ${lib.getExe superpowersAgent} "$@"
        '';
      };

      packageBundle = pkgs.symlinkJoin {
        name = "superpowers-hardened-${version}";
        paths = [
          superpowers
          superpowersAgent
        ];
        meta.mainProgram = "superpowers";
      };
    in {
      packages = {
        default = packageBundle;
        superpowers = packageBundle;
        "superpowers-agent" = superpowersAgent;
        repo = superpowersRepo;
      };

      apps = {
        default = flake-utils.lib.mkApp {
          drv = packageBundle;
          exePath = "/bin/superpowers";
        };
        superpowers = flake-utils.lib.mkApp {
          drv = packageBundle;
          exePath = "/bin/superpowers";
        };
        "superpowers-agent" = flake-utils.lib.mkApp {
          drv = superpowersAgent;
          exePath = "/bin/superpowers-agent";
        };
      };

      devShells.default = pkgs.mkShell {
        packages = [
          pkgs.git
          pkgs.nodejs
        ];
        shellHook = ''
          export SUPERPOWERS_REPO=$PWD
          echo "SUPERPOWERS_REPO=$SUPERPOWERS_REPO"
          echo "Try: superpowers --help"
        '';
      };
    });
}
