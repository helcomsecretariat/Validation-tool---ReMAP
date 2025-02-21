import arcpy
import os
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    input_dataset_path = arcpy.GetParameterAsText(0)
    output_dataset_path = arcpy.GetParameterAsText(1)
    generalOutputInfo = {'error': False, 'infoMessages': []}
        
    try:
        if arcpy.Exists(input_dataset_path):
            output_dataset_path = output_dataset_path + "_" + str(time)
            if not arcpy.Exists(output_dataset_path):
                raster = arcpy.Raster(input_dataset_path)
                raster.save(output_dataset_path)
                generalOutputInfo['infoMessages'].append({'message': 'Raster saved.'})
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Output raster already exists.'})
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read input raster.'})
    except Exception as e:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed to read or save raster. ERROR: ' + str(e)})
    
    if not generalOutputInfo['error']:
        try:
            arcpy.Delete_management(input_dataset_path)
        except Exception as e:
            generalOutputInfo['infoMessages'].append({'warning': 'Failed to delete input raster. Reason: ' + str(e)})
            
    arcpy.SetParameter(2, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))