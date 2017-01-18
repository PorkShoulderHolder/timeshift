/**
 * Created by sam.royston on 7/22/15.
 */
            function componentToHex(c) {
                var hex = c.toString(16);
                return hex.length == 1 ? "0" + hex : hex;
            }

            function rgbToHex(r, g, b) {
                return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
            }

            function SpriteSet(renderer){
                this.sprites = {};
                this.detail_count = 0;
                this.max_details = 7;
                this.THUMBSIZE = 1.0;
                this.PICSIZE = 0.4;
                this.renderer = renderer;
            }

            SpriteSet.prototype.makeTextSprite = function( line_top, line_bottom, x,y,z, parameters, color){

                // adapted from http://stackoverflow.com/questions/23514274/three-js-2d-text-sprite-labels

                if ( parameters === undefined ) parameters = {};
                var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
                var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 14;
                var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 2;
                var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:255, g:255, b:255, a:1.0 };
                var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
                var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:255, g:255, b:255, a:1.0 };

                var canvas = document.createElement('canvas');
                canvas.width = borderThickness + 1900;
                canvas.height = 800;
                var context = canvas.getContext('2d');
                context.font = fontsize + "px " + fontface;

                context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
                context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

                context.lineWidth = borderThickness;

                context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";

                var line1 = line_top.split(", ").slice(0,2).join(", ");
                var line2 = line_top.split(", ").slice(2,4).join(", ");
                context.fillStyle = "#f5f5f5";
                context.fillText( "Phrases: " + line1, borderThickness, fontsize + borderThickness);
                context.fillText( line2, borderThickness, fontsize + borderThickness + 130);
                context.fillStyle = rgbToHex((color[0] * 256), (color[1] * 256) , + (color[2] * 256));
                context.fillRect( borderThickness, fontsize + borderThickness + 220, 1700, 20);
                context.fillStyle = "#f5f5f5";
                var line3 = line_bottom.split(", ").slice(0,2).join(", ");
                var line4 = line_bottom.split(", ").slice(2,4).join(", ");
                context.fillText( "Locations: " + line3, borderThickness,  fontsize + borderThickness + 400);
                context.fillText( line4, borderThickness,  fontsize + borderThickness + 530);


                var texture = new THREE.Texture(canvas);
                texture.needsUpdate = true;

                var spriteMaterial = new THREE.SpriteMaterial( { map: texture, useScreenCoordinates: false } );
                var sprite = new THREE.Sprite( spriteMaterial );
                sprite.scale.set(40,18,72);
                sprite.position.x = x;
                sprite.position.y = y;
                sprite.position.z = z;
                sprite.material.color.copy(new THREE.Color(0xd1d1d1));
                return sprite;
            };

            SpriteSet.prototype.makeImgSprite = function(url, x,y,z){
                var proxy_url = "http://" + (location.host + "/co/" + url).replace("http://","");
                var map = THREE.ImageUtils.loadTexture(proxy_url);
                var material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false } );
                material.blending = THREE.NormalBlending;
                material.Transparent = false;
                var sprite = new THREE.Sprite( material );
                // place in front.
                var pos = new THREE.Vector3(x,y,z);

                sprite.position.x = x;
                sprite.position.y = y;
                sprite.position.z = z;
                var offset = pos.sub(this.renderer.camera.position).normalize();
                sprite.position.add(offset.multiplyScalar(-0.01 * this.renderer.multiplier));

                sprite.scale.set(this.renderer.multiplier * this.PICSIZE, this.renderer.multiplier* this.PICSIZE,
                    this.renderer.multiplier* this.PICSIZE );
                return sprite;
            };

            SpriteSet.prototype.pushSpriteInfo = function(info){
                var self = this;
                var url = info.img_url;
                var coords = info.coords;
                var text = info.text;
                var username = info.user_name;
                var handle = info.handle;
                if( username != undefined &&  self.sprites[username] == undefined && self.detail_count < self.max_details ){

                    var sprite = self.makeImgSprite(url, coords[0], coords[1], coords[2]);
                    var text_sprite = self.makeTextSprite(handle, coords[0], coords[1], coords[2]);
                    this.renderer.scene.add(sprite);
                    this.renderer.scene.add(text_sprite);
                    self.sprites[username] = {"url":url, "handle":handle, "user_name":username, "text":text, "sprite":sprite, "fresh":true, "text_sprite":text_sprite};
                    self.detail_count++;
                }
                else if(username != undefined  &&  self.sprites[username] != undefined){
                    self.sprites[username].fresh = true;
                }
            };

            SpriteSet.prototype.popSpriteUrl = function(username){
                var self = this;
                if( self.sprites[username] != undefined && username != undefined){
                    this.renderer.scene.remove(self.sprites[username].sprite);
                    this.renderer.scene.remove(self.sprites[username].text_sprite);
                    delete self.sprites[username];
                    self.detail_count--;
                }
            };

            SpriteSet.prototype.consolidateUrls = function(info_dicts){
                var self = this;
                for( key in self.sprites ){
                    self.sprites[key].fresh = false;
                }
                info_dicts.forEach(function(info){
                   self.pushSpriteInfo(info);
                });
                for( key in self.sprites ){
                    if( !self.sprites[key].fresh ){
                        self.popSpriteUrl(self.sprites[key].user_name)
                    }
                }
            };
