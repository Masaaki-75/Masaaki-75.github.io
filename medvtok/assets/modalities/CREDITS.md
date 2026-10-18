# modality examples

These openly licensed examples illustrate imaging modalities. They are not presented as MedVTok training samples. Counts in the interactive pie come exclusively from the paper.


The homepage removes exterior black padding with a CSS viewport while retaining the image pixels and natural aspect ratio. The 2D CT example is additionally flipped vertically for display; the CT cube continues to use the original slice orientation.

All WebP derivatives retain the respective source image license. Source metadata (including EXIF) is omitted.

## Fundus

- File: `fundus.webp`
- Original: [Fundus photograph of normal left eye.jpg](https://commons.wikimedia.org/wiki/File:Fundus_photograph_of_normal_left_eye.jpg)
- Author: Mikael Häggström
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Changes: resized and encoded as WebP.

## Dermoscopy

- File: `dermoscopy.webp`
- Original: [Nevus melanocítico intradérmico (RPS 09-12-2019) imagen dermatoscópica.jpg](https://commons.wikimedia.org/wiki/File:Nevus_melanoc%C3%ADtico_intrad%C3%A9rmico_%28RPS_09-12-2019%29_imagen_dermatosc%C3%B3pica.jpg)
- Author: Raimundo Pastor
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Changes: resized and encoded as WebP.

## Ultrasound

- File: `ultrasound.webp`
- Original: [Ultrasonography of a normal liver.jpg](https://commons.wikimedia.org/wiki/File:Ultrasonography_of_a_normal_liver.jpg)
- Author: Mikael Häggström
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Changes: resized and encoded as WebP.

## Pathology

- File: `pathology.webp`
- Original: [Histopathology of parathyroid congestion.jpg](https://commons.wikimedia.org/wiki/File:Histopathology_of_parathyroid_congestion.jpg)
- Author: Mikael Häggström, M.D.
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Changes: resized and encoded as WebP.

## X-ray

- File: `xray.webp`
- Original: [Normal posteroanterior (PA) chest radiograph (X-ray).jpg](https://commons.wikimedia.org/wiki/File:Normal_posteroanterior_%28PA%29_chest_radiograph_%28X-ray%29.jpg)
- Author: Mikael Häggström
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Changes: resized and encoded as WebP.

## OCT

- File: `oct.webp`
- Original: [SD-OCT Optic Disc Cross-Sections.png](https://commons.wikimedia.org/wiki/File:SD-OCT_Optic_Disc_Cross-Sections.png)
- Author: Wies6014
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Changes: resized and encoded as WebP.

## Endoscopy

- File: `endoscopy.webp`
- Original: [Melanosis coli.jpg](https://commons.wikimedia.org/wiki/File:Melanosis_coli.jpg)
- Author: Samir at English Wikipedia
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Changes: resized and encoded as WebP.

## CT: 2D slice and 3D cube

- Source: [3D Slicer SampleData](https://github.com/Slicer/Slicer/blob/main/Modules/Scripted/SampleData/SampleData.py); CTChest
- Original volume: [download](https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e)
- SHA-256: `4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e`
- License: [3D Slicer Contribution and Software License Agreement](Slicer-License.txt)
- Derived files: `ct-axial.webp`, `ct-coronal.webp`, `ct-sagittal.webp`
- Changes: orthogonal center slices extracted from the same volume, reoriented using NRRD physical directions, display-windowed, resized with voxel aspect ratios preserved, padded, and converted to WebP. The cube maps these slices to six faces, with each slice used on opposing faces; it is not a surface or full volume rendering.

## MRI: 2D slice and 3D cube

- Source: [3D Slicer SampleData](https://github.com/Slicer/Slicer/blob/main/Modules/Scripted/SampleData/SampleData.py); MRHead
- Original volume: [download](https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93)
- SHA-256: `cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93`
- License: [3D Slicer Contribution and Software License Agreement](Slicer-License.txt)
- Derived files: `mri-axial.webp`, `mri-coronal.webp`, `mri-sagittal.webp`
- Changes: orthogonal center slices extracted from the same volume, reoriented using NRRD physical directions, display-windowed, resized with voxel aspect ratios preserved, padded, and converted to WebP. The cube maps these slices to six faces, with each slice used on opposing faces; it is not a surface or full volume rendering.
