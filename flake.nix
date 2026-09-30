{
  description = "Horse Tinder dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [ nodejs_22 sqlite ];
        shellHook = ''
          export DATABASE_URL="file:./dev.db"
          export SESSION_SECRET="dev-secret-change-me"
          echo "Horse Tinder dev shell. Node $(node -v)"
        '';
      };
    };
}
